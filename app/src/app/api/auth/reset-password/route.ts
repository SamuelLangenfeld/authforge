import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { handleValidationError, handleRouteError, createErrorResponse, createSuccessMessageResponse } from "@/app/lib/route-helpers";
import { hashPassword } from "@/app/lib/crypto-helpers";
import { validateTokenExpiration } from "@/app/lib/auth-helpers";
import { resetPasswordSchema } from "@/app/lib/schemas";

const invalidMessage = "Invalid or expired reset token";

/**
 * POST /api/auth/reset-password
 *
 * Completes the password reset by validating the token and updating the password.
 *
 * This route:
 * - Validates the reset token and new password
 * - Finds the password reset token in the database
 * - Verifies the token hasn't expired
 * - Finds the associated user
 * - Hashes the new password
 * - Updates the user's password
 * - Deletes the used reset token
 * - Returns success message
 *
 * @param req - Request body should contain { token, password }
 * @returns JSON with success message
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = resetPasswordSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { token, password } = validationResult.data;

    // Find reset token in database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    // Validate token exists and hasn't expired
    const tokenError = await validateTokenExpiration(
      resetToken,
      async (t) => {
        await prisma.passwordResetToken.delete({ where: { id: t.id } });
      },
      invalidMessage,
      400
    );
    if (tokenError) return tokenError;

    // At this point, resetToken is guaranteed to be non-null
    const validResetToken = resetToken!;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: validResetToken.userId },
    });

    if (!user) {
      return createErrorResponse(invalidMessage, 400);
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the used reset token
    await prisma.passwordResetToken.delete({
      where: { id: validResetToken.id },
    });

    return createSuccessMessageResponse("Password has been reset successfully");
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
