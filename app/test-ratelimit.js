/**
 * Simple script to test rate limiting on auth endpoints
 * Run with: node test-ratelimit.js
 */

const BASE_URL = 'http://localhost:3000';

async function testRateLimit(endpoint, maxRequests = 10) {
  console.log(`\nTesting rate limit on ${endpoint}...`);
  console.log(`Sending ${maxRequests} requests rapidly...\n`);

  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0,
  };

  for (let i = 1; i <= maxRequests; i++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123',
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        results.rateLimited++;
        const retryAfter = response.headers.get('Retry-After');
        const remaining = response.headers.get('X-RateLimit-Remaining');
        console.log(
          `Request ${i}: ⛔ RATE LIMITED (Retry-After: ${retryAfter}s, Remaining: ${remaining})`
        );
      } else {
        results.success++;
        const remaining = response.headers.get('X-RateLimit-Remaining');
        console.log(
          `Request ${i}: ✓ Status ${response.status} (Remaining: ${remaining})`
        );
      }
    } catch (error) {
      results.errors++;
      console.log(`Request ${i}: ✗ Error: ${error.message}`);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n--- Results ---');
  console.log(`Successful: ${results.success}`);
  console.log(`Rate Limited: ${results.rateLimited}`);
  console.log(`Errors: ${results.errors}`);

  return results;
}

async function main() {
  console.log('=================================');
  console.log('Rate Limit Testing Tool');
  console.log('=================================');

  // Test login endpoint (5 requests per minute)
  await testRateLimit('/api/auth/login', 8);

  console.log('\n\nWaiting 3 seconds before next test...\n');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Test register endpoint (3 requests per minute)
  await testRateLimit('/api/auth/register', 6);

  console.log('\n=================================');
  console.log('Testing Complete!');
  console.log('=================================\n');
}

main().catch(console.error);
