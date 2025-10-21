import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app//lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { generateBearerToken, generateRefreshToken } from "@/app/lib/jwt";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { handleCorsPreFlight, addCorsHeaders } from "@/app/lib/cors";

const tokenSchema = z.object({
  clientId: z
    .string()
    .min(1, "Client ID is required")
    .max(200, "Client ID is too long"),
  clientSecret: z
    .string()
    .min(1, "Client secret is required")
    .max(200, "Client secret is too long"),
});

/**
 * OPTIONS /api/auth/token
 * Handle CORS preflight requests from external SaaS applications
 */
export async function OPTIONS(req: NextRequest) {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;
  return new NextResponse(null, { status: 204 });
}

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
 * @returns JSON with access_token, refresh_token, token_type, and expires_in
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = tokenSchema.safeParse(body);

    if (!validationResult.success) {
      // Extract user-friendly error messages
      const errors = validationResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      const validationErrorResponse = NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors,
        },
        { status: 400 }
      );
      return addCorsHeaders(validationErrorResponse, req);
    }

    // Use validated data (now type-safe!)
    const { clientId, clientSecret } = validationResult.data;

    // Find API credential
    const apiCredential = await prisma.apiCredential.findUnique({
      where: {
        clientId,
      },
    });

    const isValid = await bcrypt.compare(
      clientSecret,
      apiCredential?.clientSecret ||
        "$2a$10$dummyhashtopreventtimingattack00000000000000000000000000"
    );

    if (!apiCredential || !isValid) {
      const unauthorizedResponse = NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
      return addCorsHeaders(unauthorizedResponse, req);
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
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    const response = NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 3600, // 1 hour in seconds
    });

    return addCorsHeaders(response, req);
  } catch (e: unknown) {
    const message = errorMessage(e);
    const errorResponse = NextResponse.json(
      { error: message },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse, req);
  }
}
