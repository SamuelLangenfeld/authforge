# AuthForge Test Suite

Comprehensive test suite for AuthForge authentication and authorization systems. These tests demonstrate critical security practices and verify core functionality.

## Quick Start

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run specific test file
npm run test auth/timing-attacks.test.ts

# Watch specific directory
npm run test __tests__/api
```

## Test Coverage

### 1. **Timing Attack Prevention Tests** ⭐⭐⭐⭐⭐
**File:** `auth/timing-attacks.test.ts`

Tests that verify constant-time comparison prevents user enumeration attacks.

**What it tests:**
- Login endpoint takes similar time for valid email + wrong password vs invalid email
- Token exchange endpoint takes similar time for valid client + wrong secret vs invalid client
- Both endpoints maintain bcrypt execution time (~100ms)
- Generic error messages prevent account enumeration

**Why it matters:**
- Without constant-time comparison, attackers can enumerate valid usernames via response timing
- Demonstrates understanding of cryptographic edge cases
- Critical for security (OWASP A01)

**How to run:**
```bash
npm run test auth/timing-attacks.test.ts
```

**Expected output:**
```
✓ Login Endpoint - Constant Time Comparison
  ✓ should take similar time for valid email + wrong password vs invalid email
  ✓ should reject both valid wrong password and invalid email with same error
  ✓ should verify bcrypt is actually being executed
✓ Token Exchange Endpoint - Constant Time Comparison
  ✓ should take similar time for valid client + wrong secret vs invalid client
  ✓ should reject both with same error status
```

---

### 2. **Authorization Boundary Tests** ⭐⭐⭐⭐⭐
**File:** `api/authorization-boundary.test.ts`

Tests that verify SaaS API clients cannot access other organizations' data.

**What it tests:**
- Org A cannot list Org B's users (403 Forbidden)
- Org A cannot create users in Org B (403 Forbidden)
- Org A cannot read/update/delete Org B's users
- Authorization validated on every endpoint
- Missing authorization headers rejected (401)

**Why it matters:**
- Most critical security issue in multi-tenant systems
- A bug here means data leaks between organizations
- Demonstrates understanding of multi-tenant architecture
- Every endpoint must validate org boundaries

**How to run:**
```bash
npm run test api/authorization-boundary.test.ts
```

**Setup:**
- Creates 2 test organizations
- Creates API credentials for each org
- Creates users in each org
- Tests cross-org access attempts

**Expected output:**
```
✓ GET /api/organizations/:orgId/users - List Users
  ✓ should allow Org1 to list its own users
  ✓ should prevent Org2 from listing Org1 users (403 Forbidden)
✓ POST /api/organizations/:orgId/users - Create User
  ✓ should allow Org1 to create a user in its org
  ✓ should prevent Org2 from creating users in Org1 (403 Forbidden)
✓ Authorization Header Verification
  ✓ should reject requests without authorization header (401)
```

---

### 3. **Token Rotation Tests** ⭐⭐⭐⭐⭐
**File:** `auth/token-rotation.test.ts`

Tests that verify refresh tokens are properly rotated, preventing replay attacks.

**What it tests:**
- Initial token exchange returns valid tokens
- Refresh token successfully returns new tokens
- Old refresh token becomes invalid after rotation
- New token can be used for subsequent refreshes
- Malformed tokens rejected
- Tokens from different clients rejected

**Why it matters:**
- Prevents replay attacks if token is stolen
- Token rotation invalidates old tokens immediately
- Demonstrates understanding of token lifecycle
- Critical for long-lived refresh tokens (30 days)

**How to run:**
```bash
npm run test auth/token-rotation.test.ts
```

**Key scenarios tested:**
1. Normal refresh flow
2. Old token invalidation after rotation
3. Preventing reuse of old tokens
4. Cross-client token rejection
5. Concurrent refresh handling

**Expected output:**
```
✓ Refresh Token Exchange
  ✓ should get initial tokens via token exchange
  ✓ should accept refresh token and return new token pair
  ✓ should invalidate old refresh token after rotation
  ✓ should allow using new token after rotation
  ✓ should prevent token reuse after compromise scenario
```

---

### 4. **Rate Limiting Tests** ⭐⭐⭐⭐
**File:** `auth/rate-limiting.test.ts`

Tests that verify rate limiting prevents brute force attacks.

**What it tests:**
- Normal requests are not rate limited
- Rapid requests trigger 429 Too Many Requests
- Different endpoints have different limits
- Retry-After headers included when rate limited
- Brute force attempts blocked

**Why it matters:**
- Prevents credential brute force attacks
- Prevents account enumeration
- Different limits for different endpoints
- Critical for security (OWASP A07)

**How to run:**
```bash
npm run test auth/rate-limiting.test.ts
```

**Limits (as configured):**
- Login: 5 requests per minute
- Token Exchange: 10 requests per minute
- Forgot Password: Configurable (typically higher)

**Expected output:**
```
✓ Login Rate Limiting
  ✓ should allow normal login attempts
  ✓ should block rapid login attempts (429 Too Many Requests)
✓ Attack Scenarios
  ✓ should prevent credential brute force
  ✓ should prevent email enumeration brute force
```

---

## Test Architecture

### Test Structure
```
__tests__/
├── auth/
│   ├── timing-attacks.test.ts          # Constant-time comparison
│   ├── token-rotation.test.ts          # Token lifecycle
│   └── rate-limiting.test.ts           # Brute force prevention
├── api/
│   ├── authorization-boundary.test.ts  # Multi-tenant security
│   └── (future: CRUD operations, validation)
└── README.md
```

### Test Utilities

**Performance Timing:**
```typescript
function measureTime(fn: () => Promise<any>) {
  // Measures execution time in milliseconds
}

function analyzeTimings(timings: number[]) {
  // Returns: mean, median, min, max, range
}
```

**Database Cleanup:**
- `beforeAll()` - Creates test data
- `afterAll()` - Deletes test data
- Prevents test pollution and keeps database clean

**Prisma Usage:**
```typescript
import prisma from '@/app/lib/db';

// All tests use real database (not mocked)
// This provides real-world security testing
```

---

## Running Tests in CI/CD

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:run
```

---

## Test Results Interpretation

### Timing Attack Tests
**Good Result:**
```
Valid Email + Wrong Password: { mean: 105.2ms, range: 8.5ms }
Invalid Email + Any Password: { mean: 103.8ms, range: 7.2ms }
Time Difference: 1.4ms ✓
```

**Bad Result:**
```
Valid Email + Wrong Password: { mean: 105.2ms }
Invalid Email + Any Password: { mean: 15.3ms }  ← User enumeration vulnerability!
```

### Authorization Boundary Tests
**Expected Status Codes:**
- `200` - Own org, allowed operation
- `201` - Create in own org
- `403` - Cross-org access attempt (CORRECT)
- `401` - No authorization header
- `400` - Invalid input

### Token Rotation Tests
**Expected Token Structure:**
```json
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

**Token Payload (decoded):**
```json
{
  "clientId": "...",
  "orgId": "...",
  "type": "api",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## Portfolio Value

These tests demonstrate:

1. **Security Knowledge**
   - Understanding of timing attacks and mitigation
   - Multi-tenant authorization patterns
   - Token lifecycle management
   - Brute force prevention

2. **Testing Expertise**
   - Performance testing (timing measurements)
   - Integration testing (real database)
   - Security testing best practices
   - Comprehensive edge case coverage

3. **Professional Development**
   - Automated testing in CI/CD
   - Clear test documentation
   - Reproducible test setup/teardown
   - Real-world security scenarios

**Talking Points for Interviews:**
- "Implemented timing attack mitigation tests to verify constant-time comparison prevents user enumeration"
- "Created comprehensive multi-tenant security tests validating org boundaries at every endpoint"
- "Built token rotation tests verifying refresh token invalidation prevents replay attacks"
- "Implemented performance-based security testing with statistical analysis"

---

## Common Issues

### Tests Fail with "Cannot connect to database"
**Solution:**
```bash
# Ensure database is running
docker-compose up -d

# Reset database
npm run prisma:migrate
```

### Rate Limiting Tests Fail
**Reason:** Rate limiting is typically per-IP. If tests run from different IPs, limits reset.

**Solution:**
- Run tests from single IP
- Modify rate limiter to use test-specific key
- Use Docker to ensure consistent IP

### Authorization Tests Fail with "Org not found"
**Solution:**
```bash
# Ensure prisma migration is up to date
npm run prisma:migrate

# Seed initial data
npm run prisma:seed
```

---

## Adding New Tests

### Test Template
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/app/lib/db';

describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should do something', async () => {
    // Test implementation
    expect(actual).toBe(expected);
  });
});
```

### Best Practices
1. Always cleanup with `afterAll()`
2. Use descriptive test names
3. Include comments explaining "why" not just "what"
4. Test both success and failure cases
5. Use realistic test data
6. Keep tests isolated (no dependencies between tests)

---

## Documentation Resources

- **Vitest Docs:** https://vitest.dev/
- **Security Testing:** https://owasp.org/
- **JWT Best Practices:** https://tools.ietf.org/html/rfc7519
- **Multi-Tenant Security:** https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_SaaS_HTML5_Web_Application_Cheat_Sheet.html

---

## Performance Benchmarks

Expected test execution times:
- Timing attacks: 60-90 seconds (multiple measurements)
- Authorization boundary: 30-40 seconds
- Token rotation: 20-30 seconds
- Rate limiting: 30-50 seconds

**Total:** ~3-4 minutes for full test suite

---

## Contributing Tests

When adding new tests:
1. Focus on security-critical paths
2. Include both positive and negative tests
3. Test edge cases
4. Document why the test matters
5. Ensure cleanup to avoid test pollution

---

**Happy Testing! 🧪**

These tests represent best practices in security testing and demonstrate professional-grade testing expertise.
