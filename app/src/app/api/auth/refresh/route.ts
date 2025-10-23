import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import {
  generateBearerToken,
  generateRefreshToken,
  verifyToken,
} from "@/app/lib/jwt";
import { handleValidationError, handleRouteError, createErrorResponse } from "@/app/lib/route-helpers";
import { validateTokenExpiration } from "@/app/lib/auth-helpers";
import { getRefreshTokenExpiration } from "@/app/lib/token-helpers";
import { refreshSchema } from "@/app/lib/schemas";

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
 * @param req - Request body should contain { refreshToken }
 * @returns JSON with accessToken, refreshToken, tokenType, and expiresIn
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = refreshSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    // Use validated data (now type-safe!)
    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { refreshToken } = validationResult.data;

    // Verify JWT signature and expiration
    let payload;
    try {
      payload = await verifyToken(refreshToken);
    } catch {
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
        token: refreshToken,
        clientId,
      },
    });

    // Validate token exists and hasn't expired
    const tokenError = await validateTokenExpiration(
      storedToken,
      async (t) => {
        await prisma.refreshToken.delete({ where: { id: t.id } });
      },
      invalidMessage,
      401
    );
    if (tokenError) return tokenError;

    // At this point, storedToken is guaranteed to be non-null
    const refreshToken = storedToken!;

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
      where: { id: refreshToken.id },
    });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        clientId,
        expiresAt: getRefreshTokenExpiration(),
      },
    });

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
      expiresIn: 3600, // 1 hour in seconds
    });
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
