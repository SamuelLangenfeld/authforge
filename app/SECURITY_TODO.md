# Security Improvements TODO

## ✅ Already Fixed
- [x] Password hashing on registration
- [x] API credentials hashing bug (now hashing apiSecret correctly)
- [x] User enumeration via login errors (now returns generic "invalid credentials")
- [x] Missing await on Bearer token verification in middleware
- [x] Debug logging removed from middleware

---

## 🔴 HIGH Priority

### 1. Add Rate Limiting
**Status:** Not implemented
**Risk:** Brute force attacks on login/registration endpoints

**Implementation:**
```bash
npm install @upstash/ratelimit @upstash/redis
# OR use express-rate-limit if not using Upstash
npm install express-rate-limit
```

Add to login/register routes:
```typescript
// Example with a simple in-memory store for development
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: "minute"
});
```

**Files to modify:**
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`

### 2. Add Input Validation with Zod
**Status:** Not implemented
**Risk:** Invalid data, injection attacks, crashes from malformed input

**Implementation:**
```bash
npm install zod
```

**Example schema for registration:**
```typescript
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  name: z.string().min(1, 'Name is required').max(100),
  orgName: z.string().min(1, 'Organization name required').max(100),
});
```

**Files to modify:**
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- All API routes accepting user input

### 3. Improve Password Error Handling
**Status:** Partially fixed
**File:** `src/app/api/auth/login/route.ts:18-21`

**Current issue:** Still reveals when password is missing (different error than invalid credentials)

**Fix:**
```typescript
// CURRENT:
if (!user?.password) {
  return NextResponse.json({ message: "password required" }, { status: 403 });
}

// SHOULD BE (combine all failure cases):
if (!user?.password || !await bcrypt.compare(password, user.password)) {
  return NextResponse.json({ message: "invalid credentials" }, { status: 401 });
}
```

---

## 🟡 MEDIUM Priority

### 4. Remove TypeScript 'any' Types
**Status:** Multiple occurrences
**Risk:** Type safety bypassed, potential runtime errors

**Files to update:**
- `src/middleware.ts:40` - `(await verifyToken(token)) as any`
- `src/middleware.ts:71` - `tokenData as any`

**Fix:** Create proper types for JWT payload:
```typescript
// In src/app/lib/types.ts
export type JWTPayload = {
  userId: string;
  iat?: number;
  exp?: number;
};

export type APIJWTPayload = {
  clientId: string;
  type: 'api';
  iat?: number;
  exp?: number;
};
```

### 5. Implement Refresh Tokens
**Status:** Not implemented
**Risk:** Poor UX (session expires every hour), security trade-off

**Implementation approach:**
- Store refresh tokens in database with expiry
- Create `/api/auth/refresh` endpoint
- Return both access and refresh tokens on login
- Short-lived access tokens (15 min), longer refresh tokens (7 days)

### 6. Add Security Headers
**Status:** Not implemented
**File:** Create `next.config.js` or update existing

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
        ],
      },
    ];
  },
};
```

### 7. Enhance Cookie Security
**Status:** Partial
**File:** `src/app/api/auth/login/route.ts:28-34`

**Current:** Only uses secure in production
**Improvement:**
```typescript
response.cookies.set("jwt", token, {
  httpOnly: true,
  secure: true,  // Always true if using HTTPS
  sameSite: "strict",
  path: "/",
  maxAge: 60 * 60,
});
```

### 8. Add CSRF Protection
**Status:** Not implemented
**Risk:** Cross-site request forgery on state-changing operations

**Options:**
- Use `csrf` npm package
- Implement double-submit cookie pattern
- Use SameSite cookie attribute (already using "strict")

---

## 🟢 LOW Priority (Nice to Have)

### 9. Account Lockout After Failed Attempts
Track failed login attempts in database, lock account after 5 failures for 15 minutes.

### 10. Email Verification on Registration
Require users to verify email before full access.

### 11. Password Reset Flow
Implement "forgot password" with secure token-based reset.

### 12. Two-Factor Authentication (2FA/MFA)
Add TOTP-based 2FA using `speakeasy` or similar library.

### 13. Audit Logging
Log all sensitive operations:
- Login attempts (success/failure)
- Password changes
- Role changes
- Member additions/removals

**Create table:**
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  details   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])
}
```

### 14. Regular Security Maintenance
- Run `npm audit` regularly and fix vulnerabilities
- Keep dependencies up to date
- Review access logs for suspicious activity
- Rotate JWT secrets periodically
- Monitor for unusual database queries

### 15. Environment Variable Validation
Add startup validation that all required env vars are present:
```typescript
// src/app/lib/env.ts
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'HOST_URL',
] as const;

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

### 16. API Request Size Limits
Prevent DOS attacks via large payloads:
```typescript
// In next.config.js
module.exports = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
```

### 17. Content Security Policy (CSP)
Add CSP headers to prevent XSS:
```typescript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
}
```

### 18. Add Helmet for Express (if using Express)
If you add Express server:
```bash
npm install helmet
```

---

## 📋 Security Checklist Before Production

- [ ] All HIGH priority items completed
- [ ] HTTPS enforced in production
- [ ] Environment variables secured (never committed)
- [ ] Database backups configured
- [ ] Error messages don't leak sensitive info
- [ ] All dependencies audited (`npm audit`)
- [ ] Rate limiting on all auth endpoints
- [ ] Input validation on all API routes
- [ ] Security headers configured
- [ ] Monitoring/alerting set up
- [ ] Incident response plan documented
- [ ] Regular security testing scheduled

---

## 🔍 Testing Recommendations

1. **Penetration Testing Tools:**
   - OWASP ZAP
   - Burp Suite
   - sqlmap (for SQL injection testing)

2. **Dependency Scanning:**
   - `npm audit`
   - Snyk
   - Dependabot

3. **Code Analysis:**
   - ESLint security plugins
   - SonarQube

---

**Last Updated:** 2025-10-13
**Review Frequency:** Monthly or after major changes
