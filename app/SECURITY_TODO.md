# Security Improvements TODO

## ✅ Already Fixed
- [x] Password hashing on registration
- [x] API credentials hashing bug (now hashing apiSecret correctly)
- [x] User enumeration via login errors (now returns generic "invalid credentials")
- [x] Missing await on Bearer token verification in middleware
- [x] Debug logging removed from middleware
- [x] Input validation with Zod on `/api/auth/login` and `/api/auth/register`
- [x] Password error handling in login route (consolidated to prevent enumeration)
- [x] Timing attack mitigation in login route (dummy bcrypt hash)
- [x] Refresh token endpoint created (`/api/auth/refresh`) with token rotation
- [x] SameSite cookie attribute for CSRF protection (`sameSite: "strict"`)
- [x] Security headers configured in `next.config.ts` (HSTS, X-Frame-Options, etc.)

---

## 🔴 HIGH Priority

### 1. Add Rate Limiting
**Status:** Not implemented
**Risk:** Brute force attacks on login/registration/token endpoints

**Implementation:**
```bash
npm install @upstash/ratelimit @upstash/redis
# OR use express-rate-limit if not using Upstash
npm install express-rate-limit
```

Add to auth routes:
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
- `src/app/api/auth/token/route.ts`
- `src/app/api/auth/refresh/route.ts`

### 2. Add Zod Validation to Remaining Auth Routes
**Status:** Partially implemented (login and register done)
**Risk:** Invalid data, injection attacks, crashes from malformed input

**Files still needing validation:**
- `src/app/api/auth/token/route.ts` - validate clientId and clientSecret
- `src/app/api/auth/refresh/route.ts` - validate refresh_token format

**Example for token route:**
```typescript
const tokenSchema = z.object({
  clientId: z.string().min(1).max(200),
  clientSecret: z.string().min(1).max(200),
});
```

### 3. Fix Middleware TypeScript 'any' Types
**Status:** Not fixed
**File:** `src/middleware.ts:38, 69`
**Risk:** Type safety bypassed, potential runtime errors

**Current code:**
```typescript
const tokenData = (await verifyToken(token)) as any;  // line 38
const { orgId } = tokenData as any;  // line 69
```

**Fix:** Create proper types for JWT payload:
```typescript
// In src/app/lib/types.ts
export type UserJWTPayload = {
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

### 4. Add /api/auth/refresh to Public Routes in Middleware
**Status:** Missing
**File:** `src/middleware.ts:4-9`
**Risk:** Refresh endpoint is protected by middleware, preventing token refresh

**Current:**
```typescript
const publicRoutes = [
  "/api/auth/token",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];
```

**Should be:**
```typescript
const publicRoutes = [
  "/api/auth/token",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/refresh",  // Add this
];
```

### 5. Timing Attack in /api/auth/token Route
**Status:** Not fixed
**File:** `src/app/api/auth/token/route.ts:50-60`
**Risk:** User enumeration via response timing

**Current code:**
```typescript
if (!apiCredential) {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

const isValid = await bcrypt.compare(clientSecret, apiCredential.clientSecret);
```

**Fix:** Always run bcrypt even when credential doesn't exist:
```typescript
const isValid = await bcrypt.compare(
  clientSecret,
  apiCredential?.clientSecret ||
    "$2a$10$dummyhashtopreventtimingattack00000000000000000000000000"
);

if (!apiCredential || !isValid) {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
```

---

## 🟡 MEDIUM Priority

### 6. Consider Changing SameSite from "strict" to "lax"
**Status:** Currently using "strict"
**File:** `src/app/api/auth/login/route.ts:69`
**Trade-off:** Better UX vs slightly reduced security

**Current:**
```typescript
sameSite: "strict"  // Maximum security but can break UX
```

**Recommendation:**
```typescript
sameSite: "lax"  // Still prevents CSRF on POST/PUT/DELETE, better UX
```

**Why change?**
- Users clicking links from emails/Slack appear logged out with "strict"
- "lax" provides same CSRF protection for state-changing requests
- Only consider "lax" if external deep-linking is common in your app

### 7. Add Cleanup Job for Expired Refresh Tokens
**Status:** Not implemented
**Risk:** Database bloat from expired tokens

**Implementation:** Create a cron job or scheduled task:
```typescript
// Clean up expired refresh tokens daily
await prisma.refreshToken.deleteMany({
  where: {
    expiresAt: {
      lt: new Date().toISOString(),
    },
  },
});
```

### 8. Add Request Body Size Limits
**Status:** Unknown
**Risk:** DoS attacks via large payloads

Check Next.js config for body size limits:
```typescript
// In next.config.ts
export default {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
```

---

## 🟢 LOW Priority (Nice to Have)

### 9. Add Common Password Checking
**Status:** Not implemented
**Risk:** Users choosing easily guessable passwords

**Implementation:**
```typescript
// Load from https://github.com/danielmiessler/SecLists
const commonPasswords = new Set([/* top 10k passwords */]);

const passwordSchema = z.string()
  .min(12)
  .max(72)
  .refine(
    (password) => !commonPasswords.has(password.toLowerCase()),
    { message: 'This password appears in known data breaches' }
  );
```

Or use haveibeenpwned.com API for real-time checking.

### 10. Account Lockout After Failed Attempts
Track failed login attempts in database, lock account after 5 failures for 15 minutes.

### 11. Email Verification on Registration
Require users to verify email before full access.

### 12. Password Reset Flow
Implement "forgot password" with secure token-based reset.

### 13. Two-Factor Authentication (2FA/MFA)
Add TOTP-based 2FA using `speakeasy` or similar library.

### 14. Audit Logging
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

### 15. Regular Security Maintenance
- Run `npm audit` regularly and fix vulnerabilities
- Keep dependencies up to date
- Review access logs for suspicious activity
- Rotate JWT secrets periodically
- Monitor for unusual database queries

### 16. Environment Variable Validation
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

### 17. Content Security Policy (CSP)
Add CSP headers to prevent XSS:
```typescript
// Add to next.config.ts headers
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
}
```

### 18. Add orgId to API Bearer Tokens
**Status:** Not implemented
**File:** `src/app/lib/jwt.ts`
**Issue:** API bearer tokens should include orgId for authorization

**Current:**
```typescript
export const generateBearerToken = async ({ clientId }: { clientId: string }) => {
  return new SignJWT({ clientId, type: 'api' })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encodedKey);
};
```

**Should be:**
```typescript
export const generateBearerToken = async ({
  clientId,
  orgId
}: {
  clientId: string;
  orgId: string;
}) => {
  return new SignJWT({ clientId, orgId, type: 'api' })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encodedKey);
};
```

Then fetch orgId from apiCredential in token route and include in JWT.

---

## 📋 Security Checklist Before Production

- [ ] All HIGH priority items completed
- [ ] HTTPS enforced in production
- [ ] Environment variables secured (never committed)
- [ ] Database backups configured
- [x] Error messages don't leak sensitive info
- [ ] All dependencies audited (`npm audit`)
- [ ] Rate limiting on all auth endpoints
- [x] Input validation on auth routes (login, register)
- [ ] Input validation on remaining API routes (token, refresh, members)
- [x] Security headers configured
- [x] SameSite cookies configured
- [x] Refresh token endpoint implemented
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

**Last Updated:** 2025-10-14
**Review Frequency:** Monthly or after major changes

## 📝 Recent Changes
- Added Zod validation to login and register routes
- Implemented refresh token endpoint with token rotation
- Fixed timing attack vulnerability in login route
- Consolidated password error handling to prevent enumeration
- Documented missing /api/auth/refresh in middleware public routes
- Identified need for orgId in API bearer tokens
