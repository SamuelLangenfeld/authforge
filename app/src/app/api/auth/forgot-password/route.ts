import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { sendPasswordResetEmail } from "@/app/lib/email";
import { handleValidationError, handleRouteError } from "@/app/lib/route-helpers";
import { generateVerificationToken } from "@/app/lib/token-helpers";
import { forgotPasswordSchema } from "@/app/lib/schemas";

/**
 * POST /api/auth/forgot-password
 *
 * Initiates a password reset by sending a reset token via email.
 *
 * This route:
 * - Validates the provided email address
 * - Finds the user account (without revealing if it exists)
 * - Generates a secure password reset token (24-hour expiration)
 * - Deletes any existing reset tokens for the user
 * - Stores the new reset token in the database
 * - Sends a password reset email with the token
 * - Returns a generic success message for security
 *
 * @param req - Request body should contain { email }
 * @returns JSON with success message
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { email } = validationResult.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not for security
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account with that email exists, a password reset email will be sent.",
        },
        { status: 200 }
      );
    }

    // Delete any existing password reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate new password reset token
    const { token, expiresAt } = generateVerificationToken();

    // Create new password reset token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists, a password reset email will be sent.",
    });
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
