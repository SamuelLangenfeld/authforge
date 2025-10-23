import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app//lib/db";
import { generateBearerToken, generateRefreshToken } from "@/app/lib/jwt";
import { handleValidationError, handleRouteError, createErrorResponse } from "@/app/lib/route-helpers";
import { comparePassword, DUMMY_PASSWORD_HASH } from "@/app/lib/crypto-helpers";
import { getRefreshTokenExpiration } from "@/app/lib/token-helpers";
import { tokenSchema } from "@/app/lib/schemas";

/**
 * POST /api/auth/token
 *
 * Exchanges API credentials (clientId + clientSecret) for access and refresh tokens.
 *
 * This route:
 * - Validates the provided API credentials against stored credentials
 * - Generates a short-lived access token (1 hour)
 * - Generates a long-lived refresh token (30 days)
 * - Stores the refresh token in the database
 * - Returns both tokens to the client
 *
 * @param req - Request body should contain { clientId, clientSecret }
 * @returns JSON with accessToken, refreshToken, tokenType, and expiresIn
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = tokenSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    // Use validated data (now type-safe!)
    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { clientId, clientSecret } = validationResult.data;

    // Find API credential
    const apiCredential = await prisma.apiCredential.findUnique({
      where: {
        clientId,
      },
    });

    const isValid = await comparePassword(
      clientSecret,
      apiCredential?.clientSecret || DUMMY_PASSWORD_HASH
    );

    if (!apiCredential || !isValid) {
      return createErrorResponse("Invalid credentials", 401);
    }

    // Generate tokens
    const accessToken = await generateBearerToken({
      clientId,
      orgId: apiCredential.orgId,
    });
    const refreshToken = await generateRefreshToken({ clientId });

    // Delete existing refresh tokens for this client before creating new one
    await prisma.refreshToken.deleteMany({
      where: { clientId },
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        clientId,
        expiresAt: getRefreshTokenExpiration(),
      },
    });

    return NextResponse.json({
      accessToken: accessToken,
      refreshToken: refreshToken,
      tokenType: "Bearer",
      expiresIn: 3600, // 1 hour in seconds
    });
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
