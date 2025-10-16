# Security Improvements TODO

**Application:** AuthForge (Next.js 15 App Router)
**Last Updated:** 2025-10-16
**Review Frequency:** Monthly or after major changes

---

## ✅ Already Fixed
- [x] Password hashing on registration
- [x] API credentials hashing (clientSecret hashed with bcrypt)
- [x] User enumeration via login errors (generic "invalid credentials" message)
- [x] Missing await on Bearer token verification in middleware
- [x] Debug logging removed from middleware
- [x] Input validation with Zod on `/api/auth/login`, `/api/auth/register`, `/api/auth/token`, and `/api/auth/refresh`
- [x] Timing attack mitigation in login route (dummy bcrypt hash)
- [x] Refresh token endpoint created (`/api/auth/refresh`) with token rotation
- [x] SameSite cookie attribute for CSRF protection (`sameSite: "strict"`)
- [x] Security headers configured in `next.config.ts` (HSTS, X-Frame-Options, etc.)
- [x] TypeScript types for JWT payloads (no more `any` types in middleware)
- [x] Refresh route included in public routes in middleware

---

## 🔴 CRITICAL Priority

### 1. JWT_SECRET Environment Variable Validation
**Status:** Not implemented
**Risk:** Application will crash or use `undefined` as secret
**File:** `src/app/lib/jwt.ts:3-4`

**Current code:**
```typescript
const secretKey = process.env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);
```

**Fix:** Add startup validation
```typescript
const secretKey = process.env.JWT_SECRET;

if (!secretKey) {
  throw new Error("JWT_SECRET environment variable is not defined");
}

const encodedKey = new TextEncoder().encode(secretKey);
```

**Better approach:** Create `src/app/lib/env.ts`:
```typescript
// Validate all required environment variables at startup
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

export const env = {
  JWT_SECRET: process.env.JWT_SECRET!,
  DATABASE_URL: process.env.DATABASE_URL!,
  HOST_URL: process.env.HOST_URL!,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
```

Then import and use `env` object instead of `process.env` directly.

---

### 2. Fix Timing Attack in /api/auth/token Route
**Status:** Not fixed
**Risk:** Client enumeration via response timing differences
**File:** `src/app/api/auth/token/route.ts:56-74`

**Current code:**
```typescript
const apiCredential = await prisma.apiCredential.findUnique({
  where: { clientId },
});

// Verify credentials (use generic error message to prevent enumeration)
if (!apiCredential) {
  return NextResponse.json(
    { error: "Invalid credentials" },
    { status: 401 }
  );
}

const isValid = await bcrypt.compare(
  clientSecret,
  apiCredential.clientSecret
);
```

**Problem:** When `apiCredential` is null, bcrypt.compare is NOT executed, making response ~100ms faster.

**Fix:** Always run bcrypt even when credential doesn't exist:
```typescript
const apiCredential = await prisma.apiCredential.findUnique({
  where: { clientId },
});

// Always run bcrypt to prevent timing attacks
const isValid = await bcrypt.compare(
  clientSecret,
  apiCredential?.clientSecret ||
    "$2a$10$dummyhashtopreventtimingattack00000000000000000000000000"
);

if (!apiCredential || !isValid) {
  return NextResponse.json(
    { error: "Invalid credentials" },
    { status: 401 }
  );
}
```

---

### 3. Fix Login Route Timing Attack Mitigation (Incomplete)
**Status:** Partially implemented but flawed
**Risk:** User enumeration still possible via timing
**File:** `src/app/api/auth/login/route.ts:50-60`

**Current code:**
```typescript
user = await prisma.user.findUnique({
  where: { email: email },
});
if (!user || !user?.password) {
  return getCredentialError();
}
const success = await bcrypt.compare(
  password,
  user?.password ||
    "$2a$10$dummyhashtopreventtimingattack00000000000000000000000000"
);
```

**Problem:** If `!user || !user?.password`, we return early WITHOUT running bcrypt. This creates timing difference.

**Fix:** Always run bcrypt comparison:
```typescript
const user = await prisma.user.findUnique({
  where: { email: email },
});

// ALWAYS run bcrypt to prevent timing attacks
const success = await bcrypt.compare(
  password,
  user?.password ||
    "$2a$10$dummyhashtopreventtimingattack00000000000000000000000000"
);

if (!user || !user.password || !success) {
  return getCredentialError();
}

// User is authenticated
const token = await generateToken({ userId: user.id });
// ... rest of login logic
```

---

### 4. Add orgId to API Bearer Tokens
**Status:** Not implemented
**Risk:** Middleware cannot properly authorize API requests
**File:** `src/app/lib/jwt.ts:13-18` and `src/app/api/auth/token/route.ts:84`

**Current behavior:**
- Token route generates Bearer token with only `clientId`
- Middleware tries to extract `orgId` from token payload (line 71 in middleware.ts)
- `orgId` is undefined, so middleware sets `x-org-id` header to empty string
- API routes cannot determine which organization the request is for

**Fix in `src/app/lib/jwt.ts`:**
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

**Fix in `src/app/api/auth/token/route.ts` (line 62-65):**
```typescript
// Generate tokens
const accessToken = await generateBearerToken({
  clientId,
  orgId: apiCredential.orgId
});
const refreshToken = await generateRefreshToken({ clientId });
```

**Update types in `src/app/lib/types.ts`:**
```typescript
export type APIJWTPayload = {
  clientId: string;
  type: "api";
  orgId: string; // Now required, not optional
  iat?: number;
  exp?: number;
};
```

**Update middleware `src/middleware.ts:73`:**
```typescript
requestHeaders.set("x-org-id", orgId); // No need for || ""
```

---

### 5. Add Rate Limiting to All Auth Routes
**Status:** Not implemented
**Risk:** Brute force attacks on authentication endpoints
**Impact:** HIGH - Critical for production

**Recommended library:** `@upstash/ratelimit` with Redis, or use Vercel's built-in rate limiting

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Create `src/app/lib/ratelimit.ts`:**
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters for different endpoints
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
  analytics: true,
});

export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute
  analytics: true,
});

// Helper function to check rate limit
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}
```

**Apply to routes (example for login):**
```typescript
// In src/app/api/auth/login/route.ts
import { authRateLimiter, checkRateLimit } from "@/app/lib/ratelimit";

export async function POST(req: NextRequest) {
  // Rate limiting by IP
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateLimitResult = await checkRateLimit(ip, authRateLimiter);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter: rateLimitResult.reset
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        }
      }
    );
  }

  // ... rest of login logic
}
```

**Files to add rate limiting:**
- `src/app/api/auth/login/route.ts` - 5 req/min per IP
- `src/app/api/auth/register/route.ts` - 3 req/min per IP
- `src/app/api/auth/token/route.ts` - 10 req/min per clientId
- `src/app/api/auth/refresh/route.ts` - 10 req/min per token

**Alternative (development):** For local development without Redis, use in-memory rate limiting:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { LRUCache } from "lru-cache";

const cache = new LRUCache({ max: 500 });

export const authRateLimiter = new Ratelimit({
  redis: cache as any,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
});
```

---

### 6. Fix Database Schema Issues

#### 6.1 RefreshToken.expiresAt Should Be DateTime
**Status:** Incorrect type
**Risk:** Performance issues, date comparison bugs
**File:** `prisma/schema.prisma:38`

**Current:**
```prisma
model RefreshToken {
  id           String       @id @default(uuid())
  token        String
  clientId     String
  expiresAt    String  // ❌ WRONG
}
```

**Fix:**
```prisma
model RefreshToken {
  id           String       @id @default(uuid())
  token        String       @unique
  clientId     String
  expiresAt    DateTime     @default(now())
  createdAt    DateTime     @default(now())

  @@index([clientId])
  @@index([expiresAt])
}
```

**Update queries in code:**
```typescript
// In refresh/token routes, change from:
expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

// To:
expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

// In refresh route, change from:
where: { expiresAt: { lt: new Date().toISOString() } }

// To:
where: { expiresAt: { lt: new Date() } }
```

#### 6.2 Add Database Indexes for Performance
**Status:** Missing indexes
**Risk:** Slow queries as data grows

**Add to schema:**
```prisma
model User {
  id           String       @id @default(uuid())
  email        String       @unique
  name         String
  password     String
  memberships  Membership[]
  createdAt    DateTime     @default(now())

  @@index([email])
}

model ApiCredential {
  id           String       @id @default(uuid())
  orgId        String
  organization Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  clientId     String       @unique
  clientSecret String
  createdAt    DateTime     @default(now())

  @@index([orgId])
  @@index([clientId])
}

model Membership {
  id             String       @id @default(uuid())
  userId         String
  orgId          String
  roleId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  role           Role         @relation(fields: [roleId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@unique([userId, orgId])
  @@index([userId])
  @@index([orgId])
  @@index([roleId])
}
```

#### 6.3 Add Cascading Deletes
**Status:** Not configured
**Risk:** Orphaned records

Add `onDelete: Cascade` to foreign key relations (shown above).

---

## 🟡 MEDIUM Priority

### 7. Add CORS Configuration
**Status:** Not implemented
**Risk:** API accessible from any origin
**Relevant for:** API routes used by external SaaS applications

**Create `src/app/lib/cors.ts`:**
```typescript
import { NextResponse } from "next/server";

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

export function corsHeaders(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCORS(request: Request) {
  const origin = request.headers.get('origin');

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  return null;
}
```

**Apply to API routes:**
```typescript
export async function OPTIONS(req: NextRequest) {
  return handleCORS(req) || new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  // ... route logic

  const response = NextResponse.json({ ... });
  const origin = req.headers.get('origin');
  Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
```

---

### 8. Cleanup Expired Refresh Tokens
**Status:** Not implemented
**Risk:** Database bloat from expired tokens

**Option A: API Route + Cron (Recommended for Vercel)**

Create `src/app/api/cron/cleanup-tokens/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";

export async function GET(req: NextRequest) {
  // Verify request is from authorized cron service
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Token cleanup failed:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-tokens",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Add to middleware `publicRoutes`:
```typescript
const publicRoutes = [
  "/api/auth/token",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/cron/cleanup-tokens",
];
```

Set `CRON_SECRET` in environment variables.

---

### 9. Consider Changing SameSite from "strict" to "lax"
**Status:** Currently using "strict"
**File:** `src/app/api/auth/login/route.ts:69`
**Trade-off:** Better UX vs slightly reduced security

**Current:**
```typescript
sameSite: "strict"  // Maximum security but breaks external links
```

**Consideration:**
```typescript
sameSite: "lax"  // Still prevents CSRF on POST/PUT/DELETE, better UX
```

**When to change:**
- Users clicking links from emails/Slack appear logged out with "strict"
- "lax" provides same CSRF protection for state-changing requests
- Only consider if external deep-linking is common in your app

---

### 10. Middleware Redirect Validation
**Status:** Potential open redirect vulnerability
**Risk:** Attackers could craft URLs that redirect to malicious sites
**File:** `src/middleware.ts:37,56`

**Current:**
```typescript
return NextResponse.redirect(`${process.env.HOST_URL}`);
```

**Issue:** If `HOST_URL` is not validated or can be manipulated, this could lead to open redirect.

**Fix:** Validate and use absolute URL
```typescript
// In src/app/lib/env.ts
export const env = {
  // ...
  HOST_URL: process.env.HOST_URL!,
};

// Validate it's a valid URL
if (!/^https?:\/\/.+/.test(env.HOST_URL)) {
  throw new Error('HOST_URL must be a valid absolute URL');
}

// In middleware.ts
import { env } from "./app/lib/env";

return NextResponse.redirect(new URL('/', env.HOST_URL));
```

---

### 11. Add Validation for Zod Schemas on Member Routes
**Status:** Missing input validation
**Risk:** Invalid data, injection attacks
**File:** `src/app/api/organizations/[orgId]/members/route.ts`

Currently only GET is implemented. When you add POST/PUT/DELETE, add Zod validation:

```typescript
const addMemberSchema = z.object({
  email: z.email("Invalid email address"),
  roleId: z.string().uuid("Invalid role ID"),
});

const updateMemberSchema = z.object({
  roleId: z.string().uuid("Invalid role ID"),
});
```

---

### 12. Exclude Password Field from User Queries
**Status:** Potential information leak
**Risk:** Password hashes exposed in API responses

**Check all queries that return User:**
```typescript
// Good - explicitly exclude password
const user = await prisma.user.findUnique({
  where: { id: user.id },
  select: {
    id: true,
    name: true,
    email: true,
    // password deliberately omitted
    memberships: {
      include: {
        organization: true,
        role: true,
      },
    },
  },
});
```

**Better - Create a helper:**
```typescript
// src/app/lib/prisma-helpers.ts
export const userSelectWithoutPassword = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;
```

---

## 🟢 LOW Priority (Nice to Have)

### 13. Common Password Checking
**Status:** Not implemented
**Risk:** Users choosing easily guessable passwords

Use `zxcvbn` library or haveibeenpwned.com API:

```bash
npm install zxcvbn @types/zxcvbn
```

```typescript
import zxcvbn from 'zxcvbn';

const passwordSchema = z.string()
  .min(12)
  .max(72)
  .refine(
    (password) => {
      const result = zxcvbn(password);
      return result.score >= 3; // 0-4 scale, 3 = good
    },
    { message: 'Password is too weak' }
  );
```

---

### 14. Account Lockout After Failed Attempts
**Status:** Not implemented

Track failed login attempts in database, lock account after 5 failures for 15 minutes.

**Add to schema:**
```prisma
model User {
  // ... existing fields
  failedLoginAttempts  Int      @default(0)
  lockedUntil          DateTime?
}
```

---

### 15. Email Verification on Registration
**Status:** Not implemented
**Risk:** Fake accounts, email spam

Require users to verify email before full access.

---

### 16. Password Reset Flow
**Status:** Not implemented

Implement secure token-based password reset.

---

### 17. Two-Factor Authentication (2FA/MFA)
**Status:** Not implemented

Add TOTP-based 2FA using `speakeasy` or similar library.

---

### 18. Audit Logging
**Status:** Not implemented

Log all sensitive operations:
- Login attempts (success/failure)
- Password changes
- Role changes
- Member additions/removals

**Create table:**
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String
  details   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([createdAt])
  @@index([action])
}
```

---

### 19. Content Security Policy (CSP)
**Status:** Not implemented
**Type:** App Router specific

Add CSP headers to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // ... existing headers
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';"
          },
        ],
      },
    ];
  },
};
```

**Note:** `'unsafe-eval'` and `'unsafe-inline'` may be needed for Next.js development. Tighten in production.

---

### 20. Regular Security Maintenance
- Run `npm audit` regularly and fix vulnerabilities
- Keep dependencies up to date
- Review access logs for suspicious activity
- Rotate JWT secrets periodically (requires invalidating all tokens)
- Monitor for unusual database queries

---

## 📋 Security Checklist Before Production

- [ ] **CRITICAL #1:** JWT_SECRET validation implemented
- [ ] **CRITICAL #2:** Timing attack in `/api/auth/token` fixed
- [ ] **CRITICAL #3:** Timing attack in `/api/auth/login` fixed
- [ ] **CRITICAL #4:** `orgId` included in API Bearer tokens
- [ ] **CRITICAL #5:** Rate limiting on all auth endpoints
- [ ] **CRITICAL #6:** Database schema fixed (DateTime, indexes, cascades)
- [ ] HTTPS enforced in production
- [ ] Environment variables secured (never committed)
- [ ] Database backups configured
- [x] Error messages don't leak sensitive info
- [ ] All dependencies audited (`npm audit`)
- [x] Input validation on all auth routes
- [x] Security headers configured
- [x] SameSite cookies configured
- [x] Refresh token endpoint implemented with rotation
- [ ] CORS policy configured for API routes
- [ ] Token cleanup cron job scheduled
- [ ] Password fields excluded from API responses
- [ ] Middleware redirect validation
- [ ] Monitoring/alerting set up
- [ ] Incident response plan documented
- [ ] Regular security testing scheduled

---

## 🔍 Testing Recommendations

### Automated Testing
1. **Penetration Testing Tools:**
   - OWASP ZAP
   - Burp Suite
   - Nuclei

2. **Dependency Scanning:**
   - `npm audit` (built-in)
   - Snyk
   - Dependabot (GitHub)
   - Socket.dev

3. **Code Analysis:**
   - ESLint with security plugins
   - SonarQube
   - Semgrep

### Manual Testing
- [ ] Test rate limiting by sending rapid requests
- [ ] Verify timing attacks are mitigated (compare response times)
- [ ] Confirm JWTs expire correctly
- [ ] Test CORS with different origins
- [ ] Verify refresh token rotation works
- [ ] Test account lockout (when implemented)
- [ ] Confirm middleware blocks unauthorized access

---

## 📝 Recent Changes Log

### 2025-10-16
- Completely rewrote SECURITY_TODO.md with App Router-specific guidance
- Identified CRITICAL issues with timing attacks (still present)
- Identified missing `orgId` in API Bearer tokens
- Added comprehensive rate limiting guidance with code examples
- Added database schema improvements (DateTime, indexes, cascades)
- Added CORS configuration guidance
- Added App Router-specific CSP recommendations
- Removed Pages Router references (not applicable)

---

## App Router Specific Notes

This application uses **Next.js 15 App Router**, which has different security considerations than Pages Router:

1. **No `api.bodyParser` config** - Body size limits must be handled in middleware or platform-level
2. **Route Handlers** instead of API Routes - Use `route.ts` files
3. **Server Components** by default - Less client-side exposure
4. **Middleware runs on Edge** - Keep middleware lightweight
5. **No API directory in pages** - All routes are in `app/api`

Vercel's default body size limit for App Router: **4.5MB**

---

**Priority Order for Production:**
1. Fix CRITICAL issues (#1-6) - DO NOT deploy without these
2. Implement rate limiting (CRITICAL #5)
3. Add CORS for API routes
4. Set up token cleanup cron
5. Review and implement MEDIUM priority items
6. Consider LOW priority items based on requirements
