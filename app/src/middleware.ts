import { NextResponse, NextRequest } from "next/server";
import { verifyToken } from "./app/lib/jwt";
import { UserJWTPayload, APIJWTPayload } from "./app/lib/types";
import env from "./app/lib/env";
import {
  applyRateLimit,
  getClientIdentifier,
  apiRateLimiter,
  checkRateLimit,
  getRateLimitHeaders,
} from "./app/lib/ratelimit";
import { getCorsHeaders, addCorsHeaders } from "./app/lib/cors";

const publicRoutes = [
  "/api/auth/token",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/verify-email",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/invitations/accept",
];

const clientRoutes = ["/dashboard", "/api/organizations"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientId = getClientIdentifier(request.headers);

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

  // Handle CORS preflight for all API routes (external SaaS integrations)
  if (request.method === "OPTIONS" && pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // Apply rate limiting to configured auth and invitation endpoints
  const rateLimitResponse = await applyRateLimit(pathname, clientId);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (
    publicRoutes.some((route) => {
      return pathname.startsWith(route);
    })
  ) {
    return NextResponse.next();
  }
  let token: string | undefined = "";

  // client-side routes are authorized with JWT cookies
  if (clientRoutes.some((route) => pathname.startsWith(route))) {
    token = request.cookies.get("jwt")?.value;
    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized - No JWT" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(`${env.HOST_URL}`);
    }
    try {
      const tokenData = (await verifyToken(token)) as UserJWTPayload;
      const { userId } = tokenData;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", userId);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (e) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized - Invalid JWT" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(`${env.HOST_URL}`);
    }
  }

  // other /api routes are for SaaS apps
  if (pathname.startsWith("/api")) {
    // Apply rate limiting for API routes
    const rateLimitResult = await checkRateLimit(clientId, apiRateLimiter);
    if (!rateLimitResult.allowed) {
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      const origin = request.headers.get("origin");
      const corsHeaders = getCorsHeaders(origin);

      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: { ...rateLimitHeaders, ...corsHeaders },
        }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) {
      const unauthorizedResponse = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      return addCorsHeaders(unauthorizedResponse, request);
    }
    try {
      const tokenData = (await verifyToken(token)) as APIJWTPayload;
      const { orgId, clientId } = tokenData;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-org-id", orgId);
      requestHeaders.set("x-client-id", clientId);

      // Add CORS headers to the response
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      return addCorsHeaders(response, request);
    } catch {
      const unauthorizedResponse = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      return addCorsHeaders(unauthorizedResponse, request);
    }
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
