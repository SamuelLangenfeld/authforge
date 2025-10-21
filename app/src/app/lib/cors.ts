/**
 * CORS configuration for external API access
 * Handles cross-origin requests from authorized SaaS applications
 */

import { NextRequest, NextResponse } from "next/server";
import env from "./env";

// Parse allowed origins from environment variable
const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

/**
 * Get CORS headers based on request origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.includes(origin);

  // If in development and no origins configured, allow all for testing
  const isDevelopment = env.NODE_ENV === "development";
  const allowOrigin =
    isDevelopment && allowedOrigins.length === 0
      ? "*"
      : isAllowed
        ? origin
        : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

/**
 * Handle CORS preflight requests
 * Returns a response for OPTIONS requests, or null for other methods
 */
export function handleCorsPreFlight(
  request: NextRequest
): NextResponse | null {
  const origin = request.headers.get("origin");

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  return null;
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
