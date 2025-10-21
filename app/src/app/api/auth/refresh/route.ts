import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import {
  generateBearerToken,
  generateRefreshToken,
  verifyToken,
} from "@/app/lib/jwt";
import { z } from "zod";
import { handleValidationError, handleRouteError, createErrorResponse } from "@/app/lib/route-helpers";
import { getRefreshTokenExpiration } from "@/app/lib/token-helpers";

const refreshSchema = z.object({
  refresh_token: z
    .string()
    .min(1, "Refresh token is required")
    .max(1000, "Refresh token is too long"),
});

const invalidMessage = "Invalid or expired token";

/**
 * POST /api/auth/refresh
 *
 * Exchanges a refresh token for new access and refresh tokens.
 *
 * This route:
 * - Validates the provided refresh token (JWT signature and expiration)
 * - Verifies the refresh token exists in the database and hasn't expired
 * - Generates a new access token (1 hour)
 * - Generates a new refresh token (30 days) - token rotation for security
 * - Deletes the old refresh token and stores the new one
 * - Returns both new tokens to the client
 *
 * @param req - Request body should contain { refresh_token }
 * @returns JSON with access_token, refresh_token, token_type, and expires_in
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = refreshSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    // Use validated data (now type-safe!)
    const { refresh_token } = validationResult.data;

    // Verify JWT signature and expiration
    let payload;
    try {
      payload = await verifyToken(refresh_token);
    } catch (e) {
      return createErrorResponse(invalidMessage, 401);
    }

    // Verify token type
    if (payload.type !== "refresh") {
      return createErrorResponse("Invalid token type", 401);
    }

    const clientId = payload.clientId as string;

    // Find refresh token in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refresh_token,
        clientId,
      },
    });

    // Verify token exists in database
    if (!storedToken) {
      return createErrorResponse(invalidMessage, 401);
    }

    // Check database-level expiration
    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      return createErrorResponse(invalidMessage, 401);
    }

    // Look up the API credential to get the orgId
    const apiCredential = await prisma.apiCredential.findUnique({
      where: { clientId },
    });

    if (!apiCredential) {
      return createErrorResponse(invalidMessage, 401);
    }

    // Generate new tokens
    const newAccessToken = await generateBearerToken({
      clientId,
      orgId: apiCredential.orgId,
    });
    const newRefreshToken = await generateRefreshToken({ clientId });

    // Rotate refresh token: delete old token and store new one
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        clientId,
        expiresAt: getRefreshTokenExpiration(),
      },
    });

    return NextResponse.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      expires_in: 3600, // 1 hour in seconds
    });
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
