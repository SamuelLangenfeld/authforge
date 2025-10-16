import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import errorMessage from "@/app/lib/errorMessage";
import {
  generateBearerToken,
  generateRefreshToken,
  verifyToken,
} from "@/app/lib/jwt";
import { z } from "zod";

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

    if (!validationResult.success) {
      // Extract user-friendly error messages
      const errors = validationResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors,
        },
        { status: 400 }
      );
    }

    // Use validated data (now type-safe!)
    const { refresh_token } = validationResult.data;

    // Verify JWT signature and expiration
    let payload;
    try {
      payload = await verifyToken(refresh_token);
    } catch (e) {
      return NextResponse.json({ error: invalidMessage }, { status: 401 });
    }

    // Verify token type
    if (payload.type !== "refresh") {
      return NextResponse.json(
        { error: "Invalid token type" },
        { status: 401 }
      );
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
      return NextResponse.json({ error: invalidMessage }, { status: 401 });
    }

    // Check database-level expiration
    const expiresAt = new Date(storedToken.expiresAt);
    if (expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      return NextResponse.json({ error: invalidMessage }, { status: 401 });
    }

    // Generate new tokens
    const newAccessToken = await generateBearerToken({ clientId });
    const newRefreshToken = await generateRefreshToken({ clientId });

    // Rotate refresh token: delete old token and store new one
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        clientId,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days
      },
    });

    return NextResponse.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      expires_in: 3600, // 1 hour in seconds
    });
  } catch (e: unknown) {
    const message = errorMessage(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
