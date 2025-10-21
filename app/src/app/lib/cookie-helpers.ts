import { NextResponse } from "next/server";
import env from "./env";

/**
 * JWT cookie configuration constants
 */
export const JWT_COOKIE_NAME = "jwt";
export const JWT_COOKIE_MAX_AGE = 60 * 60; // 1 hour in seconds

/**
 * Standardized JWT cookie options
 * Applied consistently across login, refresh, and logout endpoints
 */
export const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

/**
 * Sets JWT cookie on response during login
 * Cookie will be automatically sent with subsequent requests
 */
export function setJwtCookie(
  response: NextResponse,
  token: string,
  maxAge: number = JWT_COOKIE_MAX_AGE
): void {
  response.cookies.set(JWT_COOKIE_NAME, token, {
    ...JWT_COOKIE_OPTIONS,
    maxAge,
  });
}

/**
 * Clears JWT cookie during logout
 * Sets maxAge to 0 to delete the cookie
 */
export function clearJwtCookie(response: NextResponse): void {
  response.cookies.set(JWT_COOKIE_NAME, "", {
    ...JWT_COOKIE_OPTIONS,
    maxAge: 0,
  });
}
