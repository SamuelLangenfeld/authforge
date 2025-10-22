/**
 * In-memory rate limiter using rate-limiter-flexible
 * Compatible with Edge runtime (Next.js middleware)
 */

import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextResponse } from "next/server";

/**
 * Pre-configured rate limiters for different endpoints
 */

// Strict rate limiting for auth endpoints (5 requests per minute)
export const authRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// More lenient for API endpoints (60 requests per minute)
export const apiRateLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60,
});

// Very strict for registration (3 requests per minute)
export const registrationRateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60,
});

// Token endpoint (10 requests per minute)
export const tokenRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

// Refresh token endpoint (10 requests per minute)
export const refreshRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

// Forgot password endpoint (5 requests per minute)
export const forgotPasswordRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Reset password endpoint (5 requests per minute - strict to prevent token brute force)
export const resetPasswordRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Accept invitation endpoint (5 requests per minute - strict to prevent token brute force)
export const acceptInvitationRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

/**
 * Configuration mapping routes to their rate limiters
 * Each entry specifies a route pattern and its corresponding rate limiter
 */
const rateLimitConfig: Array<{
  pattern: string;
  limiter: RateLimiterMemory;
}> = [
  { pattern: "/api/auth/login", limiter: authRateLimiter },
  { pattern: "/api/auth/register", limiter: registrationRateLimiter },
  { pattern: "/api/auth/token", limiter: tokenRateLimiter },
  { pattern: "/api/auth/refresh", limiter: refreshRateLimiter },
  { pattern: "/api/auth/forgot-password", limiter: forgotPasswordRateLimiter },
  { pattern: "/api/auth/reset-password", limiter: resetPasswordRateLimiter },
  { pattern: "/api/invitations/accept", limiter: acceptInvitationRateLimiter },
];

/**
 * Apply rate limiting to a request based on pathname
 * Finds the matching route in config and applies its rate limiter
 *
 * @param pathname - The request pathname
 * @param clientId - Unique identifier for rate limiting
 * @returns NextResponse if rate limited, null if allowed
 */
export async function applyRateLimit(
  pathname: string,
  clientId: string
): Promise<NextResponse | null> {
  // Find the matching rate limiter config for this pathname
  const config = rateLimitConfig.find((entry) => pathname.startsWith(entry.pattern));

  if (!config) {
    // No rate limit configured for this path
    return null;
  }

  const result = await checkRateLimit(clientId, config.limiter);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers: getRateLimitHeaders(result),
      }
    );
  }

  return null;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the rate limit (e.g., IP address, client ID)
 * @param limiter - Rate limiter instance to use
 * @returns Object with rate limit information
 */
export async function checkRateLimit(
  identifier: string,
  limiter: RateLimiterMemory
): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}> {
  try {
    const result = await limiter.consume(identifier, 1);

    return {
      allowed: true,
      limit: limiter.points,
      remaining: result.remainingPoints,
      resetMs: result.msBeforeNext,
    };
  } catch (error) {
    // Rate limit exceeded
    if (error instanceof Error && 'msBeforeNext' in error) {
      const rateLimitError = error as any;
      return {
        allowed: false,
        limit: limiter.points,
        remaining: 0,
        resetMs: rateLimitError.msBeforeNext || 0,
      };
    }

    // Unexpected error, allow the request but log it
    console.error("Rate limiter error:", error);
    return {
      allowed: true,
      limit: limiter.points,
      remaining: 0,
      resetMs: 0,
    };
  }
}

/**
 * Get client identifier from request headers
 * Prioritizes real IP over forwarded IPs
 */
export function getClientIdentifier(
  headers: Headers,
  fallback: string = "unknown"
): string {
  // Try multiple headers in order of preference
  const ip =
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("cf-connecting-ip") || // Cloudflare
    headers.get("x-client-ip") ||
    fallback;

  return ip;
}

/**
 * Helper to create rate limit response headers
 */
export function getRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetMs: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(Date.now() + result.resetMs).toISOString(),
    "Retry-After": Math.ceil(result.resetMs / 1000).toString(),
  };
}
