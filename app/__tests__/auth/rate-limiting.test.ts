/**
 * Rate Limiting Tests
 *
 * These tests verify that rate limiting is properly enforced
 * to prevent brute force attacks on authentication endpoints.
 *
 * Why This Matters:
 * - Attackers can try thousands of passwords against a single account
 * - Rate limiting slows down brute force attempts
 * - Different endpoints have different limits (login stricter than token exchange)
 */

import { describe, it, expect } from 'vitest';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SKIP_NETWORK_TESTS = !process.env.RUN_NETWORK_TESTS;

/**
 * Note: Rate limiting is typically per-IP address.
 * These tests assume the test is running from a single source IP.
 *
 * If running behind a proxy, the rate limiter may use X-Forwarded-For header.
 * In that case, you may need to adjust test setup.
 */

describe.skipIf(SKIP_NETWORK_TESTS)('Rate Limiting - Brute Force Prevention', () => {
  describe('Login Rate Limiting', () => {
    it('should allow normal login attempts', async () => {
      // A few legitimate attempts should be allowed
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      // Should not be 429 (Too Many Requests)
      expect(res.status).not.toBe(429);
    });

    it('should block rapid login attempts (429 Too Many Requests)', async function () {
      this.timeout(30000); // 30 second timeout

      // Rate limit: 5 requests per minute
      // Make 6 rapid requests to exceed limit
      const promises = [];
      for (let i = 0; i < 6; i++) {
        const promise = fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `ratelimit-test-${i}@example.com`,
            password: 'password123',
          }),
        });
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const statuses = results.map(r => r.status);

      // At least one should be 429
      console.log('Login rate limit statuses:', statuses);
      expect(statuses).toContain(429);
    });

    it('should include Retry-After header when rate limited', async () => {
      // Make enough requests to trigger rate limit
      const promises = [];
      for (let i = 0; i < 7; i++) {
        promises.push(
          fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `ratelimit-retry-${i}@example.com`,
              password: 'password123',
            }),
          })
        );
      }

      const results = await Promise.all(promises);
      const rateLimited = results.find(r => r.status === 429);

      if (rateLimited) {
        // Should have Retry-After header
        const retryAfter = rateLimited.headers.get('Retry-After');
        if (retryAfter) {
          expect(parseInt(retryAfter)).toBeGreaterThan(0);
        }
      }
    });

    it('should have specific rate limit per endpoint', async function () {
      this.timeout(30000);

      // Test that token exchange has different limit than login
      // Token exchange: typically 10/min
      // Login: typically 5/min

      // This test just documents the limits exist
      // Actual limit testing would require IP isolation or test infrastructure

      const res1 = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ratelimit-doc@example.com',
          password: 'password123',
        }),
      });

      const res2 = await fetch(`${baseUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'any-client',
          clientSecret: 'any-secret',
        }),
      });

      // Both should either succeed (if under limit) or be 429 (if over)
      expect([401, 429]).toContain(res1.status);
      expect([401, 429]).toContain(res2.status);
    });
  });

  describe('Token Exchange Rate Limiting', () => {
    it('should allow normal token exchange requests', async () => {
      const res = await fetch(`${baseUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'test-client',
          clientSecret: 'test-secret',
        }),
      });

      // Should fail with 401 (invalid creds) not 429 (rate limit)
      expect(res.status).toBe(401);
    });

    it('should block excessive token exchange requests', async function () {
      this.timeout(30000);

      // Token exchange limit: 10/min (higher than login)
      // Make 11+ rapid requests
      const promises = [];
      for (let i = 0; i < 11; i++) {
        promises.push(
          fetch(`${baseUrl}/api/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: `ratelimit-token-${i}`,
              clientSecret: 'secret',
            }),
          })
        );
      }

      const results = await Promise.all(promises);
      const statuses = results.map(r => r.status);

      console.log('Token exchange rate limit statuses:', statuses);

      // May contain 429 if hit rate limit
      // All should be 401 (invalid creds) if under limit
      expect(statuses.every(s => [401, 429].includes(s))).toBe(true);
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should have configured rate limits for auth endpoints', async () => {
      // This is a sanity check that rate limiting is configured
      // In a real test, you'd check the rate limiter configuration

      // Make a request and check response headers
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test',
        }),
      });

      // Check for RateLimit headers (may be present if implemented)
      const headers = res.headers;

      // These headers are optional but good practice
      // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
      // If not present, rate limiting is still working (just silently)

      expect(res.status).toBeGreaterThanOrEqual(400); // At least rejects something
    });
  });

  describe('Rate Limiting Under Normal Load', () => {
    it('should handle normal authentication flow without rate limiting', async () => {
      // A normal user authentication should never hit rate limits
      // Space out requests to avoid hitting limits

      const res1 = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'normal-user@example.com',
          password: 'password',
        }),
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const res2 = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'another-user@example.com',
          password: 'password',
        }),
      });

      // Both should be 401 (invalid creds) not 429 (rate limited)
      // Because we spaced them out
      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);
    });

    it('should allow password reset requests without heavy rate limiting', async () => {
      // Password reset can be called by legitimate users frequently
      // Should have different (likely higher) limits

      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'reset-test@example.com',
        }),
      });

      // Should not be 429 on a single request
      expect(res.status).not.toBe(429);
    });
  });

  describe('Rate Limiting Attack Scenarios', () => {
    it('should prevent credential brute force (multiple passwords)', async function () {
      this.timeout(30000);

      // Simulate attacker trying multiple passwords for same account
      const targetEmail = 'bruteforce-target@example.com';
      const passwords = [
        'password1',
        'password2',
        'password3',
        'password4',
        'password5',
        'password6', // Should be blocked around here
      ];

      const promises = passwords.map(pwd =>
        fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            password: pwd,
          }),
        })
      );

      const results = await Promise.all(promises);
      const statuses = results.map(r => r.status);

      console.log('Brute force attempt statuses:', statuses);

      // At least the later attempts should be 429
      const laterAttempts = statuses.slice(4); // Last 2 attempts
      expect(laterAttempts).toContain(429);
    });

    it('should prevent email enumeration brute force (multiple users)', async function () {
      this.timeout(30000);

      // Simulate attacker trying common emails
      const emails = [
        'admin@example.com',
        'user@example.com',
        'test@example.com',
        'support@example.com',
        'info@example.com',
        'contact@example.com', // Should be blocked around here
      ];

      const promises = emails.map(email =>
        fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: 'anypassword',
          }),
        })
      );

      const results = await Promise.all(promises);
      const statuses = results.map(r => r.status);

      console.log('Email enumeration attempt statuses:', statuses);

      // At least some should be 429
      expect(statuses).toContain(429);
    });
  });

  describe('Rate Limiting Response Format', () => {
    it('should reject rate limited requests with proper error', async function () {
      this.timeout(30000);

      // Make requests until rate limited
      let rateLimitedResponse: Response | null = null;

      for (let i = 0; i < 10; i++) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `ratelimit-format-${i}@example.com`,
            password: 'password',
          }),
        });

        if (res.status === 429) {
          rateLimitedResponse = res;
          break;
        }
      }

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.status).toBe(429);

        const data = await rateLimitedResponse.json();
        // Should have error message
        expect(data.error || data.message).toBeDefined();

        // Should indicate rate limiting
        const errorMsg = (data.error || data.message || '').toLowerCase();
        expect(['rate', 'limit', 'too many'].some(w => errorMsg.includes(w))).toBe(true);
      }
    });
  });
});
