import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { sendVerificationEmail } from "@/app/lib/email";
import { handleValidationError, handleRouteError } from "@/app/lib/route-helpers";
import { generateVerificationToken } from "@/app/lib/token-helpers";
import { resendVerificationSchema } from "@/app/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validationResult = resendVerificationSchema.safeParse(body);
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

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account with that email exists and is not verified, a verification email will be sent.",
        },
        { status: 200 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, message: "Email is already verified" },
        { status: 400 }
      );
    }

    // Delete any existing verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate new verification token
    const { token, expiresAt } = generateVerificationToken();

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send verification email
    await sendVerificationEmail(user.email, token);

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
