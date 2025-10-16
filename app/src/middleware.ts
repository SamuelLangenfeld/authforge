import { NextResponse, NextRequest } from "next/server";
import { verifyToken } from "./app/lib/jwt";
import { UserJWTPayload, APIJWTPayload } from "./app/lib/types";
import env from "./app/lib/env";
import {
  checkRateLimit,
  getClientIdentifier,
  getRateLimitHeaders,
  authRateLimiter,
  registrationRateLimiter,
  tokenRateLimiter,
  refreshRateLimiter,
  apiRateLimiter,
} from "./app/lib/ratelimit";

const publicRoutes = [
  "/api/auth/token",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/refresh",
];

const clientRoutes = ["/dashboard", "/api/organizations"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientId = getClientIdentifier(request.headers);

  // Apply rate limiting to auth endpoints
  if (pathname.startsWith("/api/auth/login")) {
    const rateLimitResult = await checkRateLimit(clientId, authRateLimiter);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
  }

  if (pathname.startsWith("/api/auth/register")) {
    const rateLimitResult = await checkRateLimit(
      clientId,
      registrationRateLimiter
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
  }

  if (pathname.startsWith("/api/auth/token")) {
    const rateLimitResult = await checkRateLimit(clientId, tokenRateLimiter);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
  }

  if (pathname.startsWith("/api/auth/refresh")) {
    const rateLimitResult = await checkRateLimit(clientId, refreshRateLimiter);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
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
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const tokenData = (await verifyToken(token)) as APIJWTPayload;
      const { orgId, clientId } = tokenData;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-org-id", orgId);
      requestHeaders.set("x-client-id", clientId);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
