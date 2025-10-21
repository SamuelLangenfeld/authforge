# HTTPS Enforcement Implementation

## Overview
This document describes the HTTPS enforcement mechanisms implemented in AuthForge to ensure all production traffic uses secure connections.

## Implementation Details

### 1. HTTPS Redirect (Middleware)
**File:** `src/middleware.ts:31-41`

The middleware checks for HTTP requests in production and redirects them to HTTPS:

```typescript
// Enforce HTTPS in production
if (env.NODE_ENV === "production") {
  const protocol = request.headers.get("x-forwarded-proto");

  // If the request came through HTTP, redirect to HTTPS
  if (protocol === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, { status: 301 });
  }
}
```

**How it works:**
- Only runs in production (`NODE_ENV === "production"`)
- Checks the `x-forwarded-proto` header set by reverse proxies/load balancers
- Issues a 301 permanent redirect to the HTTPS version of the URL
- Preserves the full URL path and query parameters

### 2. HSTS Headers (Next.js Config)
**File:** `next.config.ts:14-17`

Strict-Transport-Security headers are set on all responses:

```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains; preload'
}
```

**What this does:**
- `max-age=31536000`: Browsers remember to use HTTPS for 1 year
- `includeSubDomains`: Also enforces HTTPS on all subdomains
- `preload`: Eligible for browser HSTS preload lists

**Browser behavior after first HTTPS visit:**
1. Browser receives HSTS header
2. For the next year, browser automatically converts HTTP requests to HTTPS
3. No HTTP request is sent to the server - browser enforces HTTPS locally
4. Protects against downgrade attacks and man-in-the-middle attacks

## Production Deployment Notes

### Vercel / Netlify / Railway
These platforms automatically handle TLS termination and set the `x-forwarded-proto` header:
- ✅ No additional configuration needed
- ✅ Middleware will automatically redirect HTTP to HTTPS
- ✅ HSTS headers will be sent on all responses

### Custom Deployments (Docker, VPS, etc.)
If deploying behind a reverse proxy (Nginx, Traefik, Caddy, etc.), ensure:

1. **TLS Termination:** Proxy handles HTTPS and certificates
2. **Headers Set:** Proxy must set `x-forwarded-proto: https`

**Example Nginx configuration:**
```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header Host $host;
}
```

**Example Caddy configuration:**
```
example.com {
  reverse_proxy localhost:3000
}
```
(Caddy automatically sets `X-Forwarded-Proto`)

### Direct HTTPS (No Reverse Proxy)
If running Next.js directly with HTTPS (not recommended for production):
- The middleware redirect won't be needed since all traffic is already HTTPS
- HSTS headers will still be sent
- Consider using a reverse proxy for better security and performance

## Testing

### Test HTTPS Redirect
1. Deploy to production environment
2. Try accessing `http://yourdomain.com`
3. Should redirect to `https://yourdomain.com` with 301 status

### Test HSTS Headers
```bash
curl -I https://yourdomain.com
```

Look for:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Test Browser Behavior
1. Visit `https://yourdomain.com` once
2. Clear browser cache (but not HSTS cache)
3. Try typing `http://yourdomain.com` in address bar
4. Browser should automatically upgrade to HTTPS without server request

## Security Benefits

1. **Encryption:** All data in transit is encrypted
2. **Authentication:** Server identity verified via TLS certificates
3. **Integrity:** Data cannot be modified in transit
4. **HSTS Protection:** Prevents downgrade attacks
5. **Preload Eligible:** Can be added to browser HSTS preload lists

## HSTS Preload (Optional)

To add your domain to browser HSTS preload lists:

1. Ensure HSTS header includes `preload` directive ✅ (Already configured)
2. Submit domain to https://hstspreload.org/
3. Wait for inclusion in Chrome, Firefox, Safari, Edge preload lists
4. **Warning:** Very difficult to undo - only do this for established domains

## Troubleshooting

### "Too many redirects" error
- Check that reverse proxy is setting `x-forwarded-proto` correctly
- Ensure proxy is not also doing HTTPS redirect (would create redirect loop)

### HTTPS redirect not working
- Verify `NODE_ENV=production` is set
- Check that `x-forwarded-proto` header is being set by your proxy
- Test with: `curl -H "x-forwarded-proto: http" https://yourdomain.com`

### HSTS not working
- Verify headers with `curl -I https://yourdomain.com`
- Clear browser HSTS cache if testing: chrome://net-internals/#hsts
- HSTS only works after first HTTPS visit

## Development Mode

In development (`NODE_ENV=development`):
- ✅ HTTPS redirect is disabled (works with `http://localhost:3000`)
- ⚠️ HSTS headers are still sent (but browsers typically ignore for localhost)
- No special configuration needed

## Status

✅ **HTTPS Enforcement: IMPLEMENTED**
- Middleware redirect in production: ✅
- HSTS headers configured: ✅
- Tested on Vercel/production platforms: Pending
