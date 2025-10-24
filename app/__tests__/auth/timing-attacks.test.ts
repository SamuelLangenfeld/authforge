/**
 * Timing Attack Prevention Tests
 *
 * These tests verify that authentication endpoints take consistent time
 * regardless of whether the user exists or credentials are valid.
 *
 * Why This Matters:
 * - Without timing attack mitigation, attackers can enumerate valid usernames
 * - A 50ms difference between "user exists" and "user doesn't exist" is detectable
 * - Bcrypt.compare() takes ~100ms, making timing attacks obvious without mitigation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/app/lib/db';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SKIP_NETWORK_TESTS = !process.env.RUN_NETWORK_TESTS;

// Helper to measure execution time
function measureTime(fn: () => Promise<any>) {
  return async () => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  };
}

// Helper to calculate statistics
function analyzeTimings(timings: number[]) {
  const sorted = timings.sort((a, b) => a - b);
  const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  return { mean, median, min, max, range };
}

describe.skipIf(SKIP_NETWORK_TESTS)('Timing Attack Prevention', () => {
  const validEmail = `timing-test-valid-${Date.now()}@example.com`;
  const invalidEmail = `timing-test-invalid-${Date.now()}@example.com`;
  const validPassword = 'ValidPassword123!';
  const wrongPassword = 'WrongPassword123!';

  beforeAll(async () => {
    // Clean up from any previous test runs
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [validEmail, invalidEmail],
          },
        },
      });
    } catch (e) {
      // User might not exist
    }

    // Create a valid user for testing
    await prisma.user.create({
      data: {
        email: validEmail,
        name: 'Timing Test User',
        password: await require('bcryptjs').hash(validPassword, 10),
        emailVerified: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [validEmail, invalidEmail],
        },
      },
    });
  });

  describe('Login Endpoint - Constant Time Comparison', () => {
    it('should take similar time for valid email + wrong password vs invalid email', async () => {
      const timings = {
        validEmailWrongPassword: [] as number[],
        invalidEmailAnyPassword: [] as number[],
      };

      // Run multiple times to get statistical average
      for (let i = 0; i < 5; i++) {
        // Test 1: Valid email, wrong password
        const t1 = await measureTime(async () => {
          try {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: validEmail,
                password: wrongPassword,
              }),
            });
            await res.json();
          } catch (e) {
            // Expected to fail
          }
        })();
        timings.validEmailWrongPassword.push(t1);

        // Test 2: Invalid email, any password
        const t2 = await measureTime(async () => {
          try {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: invalidEmail,
                password: wrongPassword,
              }),
            });
            await res.json();
          } catch (e) {
            // Expected to fail
          }
        })();
        timings.invalidEmailAnyPassword.push(t2);
      }

      const stats1 = analyzeTimings(timings.validEmailWrongPassword);
      const stats2 = analyzeTimings(timings.invalidEmailAnyPassword);

      console.log('Valid Email + Wrong Password:', stats1);
      console.log('Invalid Email + Any Password:', stats2);
      console.log('Time Difference:', Math.abs(stats1.mean - stats2.mean), 'ms');

      // Timing should be similar (network variance means we need larger tolerance)
      // Both paths should take ~100ms due to bcrypt.compare()
      expect(stats1.mean).toBeGreaterThan(50); // bcrypt should take time
      expect(stats2.mean).toBeGreaterThan(50);

      // The difference should be small relative to mean time
      // For network-based tests, allow up to 40% variance
      const timingDifference = Math.abs(stats1.mean - stats2.mean);
      const avgTime = (stats1.mean + stats2.mean) / 2;
      const percentDifference = (timingDifference / avgTime) * 100;
      expect(percentDifference).toBeLessThan(40);
    }, 60000); // 60s timeout for multiple requests

    it('should reject both valid wrong password and invalid email with same error', async () => {
      // Test 1: Valid email, wrong password
      const res1 = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: validEmail,
          password: wrongPassword,
        }),
      });
      const data1 = await res1.json();

      // Test 2: Invalid email, any password
      const res2 = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invalidEmail,
          password: wrongPassword,
        }),
      });
      const data2 = await res2.json();

      // Both should have same status code (401)
      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);

      // Both should have generic error message (no user enumeration)
      expect(data1.error || data1.message).toContain('invalid');
      expect(data2.error || data2.message).toContain('invalid');

      // Error messages should be identical (not revealing which part failed)
      expect(data1.error || data1.message).toBe(data2.error || data2.message);
    });

    it('should verify bcrypt is actually being executed (takes 50-200ms)', async () => {
      const timings: number[] = [];

      for (let i = 0; i < 3; i++) {
        const time = await measureTime(async () => {
          try {
            await fetch(`${baseUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: invalidEmail,
                password: 'anypassword',
              }),
            });
          } catch (e) {
            // Expected to fail
          }
        })();
        timings.push(time);
      }

      const stats = analyzeTimings(timings);
      console.log('Login endpoint timing stats:', stats);

      // bcrypt.compare should take at least 50ms (on slower systems)
      // Should not be instant (which would indicate timing attack vulnerability)
      expect(stats.min).toBeGreaterThan(30);
      expect(stats.mean).toBeGreaterThan(50);
    });
  });

  describe('Token Exchange Endpoint - Constant Time Comparison', () => {
    let validClientId: string;
    let validClientSecret: string;

    beforeAll(async () => {
      // Create an API credential for testing
      const org = await prisma.organization.create({
        data: { name: 'Timing Test Org' },
      });

      const credential = await prisma.apiCredential.create({
        data: {
          orgId: org.id,
          clientId: 'timing-test-valid-client',
          clientSecret: await require('bcryptjs').hash('valid-secret', 10),
        },
      });

      validClientId = credential.clientId;
      validClientSecret = 'valid-secret';
    });

    afterAll(async () => {
      // Clean up
      await prisma.apiCredential.deleteMany({
        where: { clientId: 'timing-test-valid-client' },
      });
      await prisma.organization.deleteMany({
        where: { name: 'Timing Test Org' },
      });
    });

    it('should take similar time for valid client + wrong secret vs invalid client', async () => {
      const timings = {
        validClientWrongSecret: [] as number[],
        invalidClientAnySecret: [] as number[],
      };

      for (let i = 0; i < 5; i++) {
        // Test 1: Valid client, wrong secret
        const t1 = await measureTime(async () => {
          try {
            const res = await fetch(`${baseUrl}/api/auth/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId: validClientId,
                clientSecret: 'wrong-secret',
              }),
            });
            await res.json();
          } catch (e) {
            // Expected to fail
          }
        })();
        timings.validClientWrongSecret.push(t1);

        // Test 2: Invalid client, any secret
        const t2 = await measureTime(async () => {
          try {
            const res = await fetch(`${baseUrl}/api/auth/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId: 'invalid-client-xyz',
                clientSecret: 'any-secret',
              }),
            });
            await res.json();
          } catch (e) {
            // Expected to fail
          }
        })();
        timings.invalidClientAnySecret.push(t2);
      }

      const stats1 = analyzeTimings(timings.validClientWrongSecret);
      const stats2 = analyzeTimings(timings.invalidClientAnySecret);

      console.log('Valid Client + Wrong Secret:', stats1);
      console.log('Invalid Client + Any Secret:', stats2);
      console.log('Time Difference:', Math.abs(stats1.mean - stats2.mean), 'ms');

      // Both should take similar time
      expect(stats1.mean).toBeGreaterThan(50);
      expect(stats2.mean).toBeGreaterThan(50);

      // Allow up to 40% variance for network-based tests
      const timingDifference = Math.abs(stats1.mean - stats2.mean);
      const avgTime = (stats1.mean + stats2.mean) / 2;
      const percentDifference = (timingDifference / avgTime) * 100;
      expect(percentDifference).toBeLessThan(40);
    }, 60000);

    it('should reject both with same error status (no client enumeration)', async () => {
      const res1 = await fetch(`${baseUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: validClientId,
          clientSecret: 'wrong-secret',
        }),
      });

      const res2 = await fetch(`${baseUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'invalid-client-xyz',
          clientSecret: 'any-secret',
        }),
      });

      // Both should return 401
      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);

      // Both should return same error response format
      const data1 = await res1.json();
      const data2 = await res2.json();

      expect(data1.error).toBeDefined();
      expect(data2.error).toBeDefined();
    });
  });
});
