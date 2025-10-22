import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { verifyToken } from "@/app/lib/jwt";
import { validateTokenExpiration } from "@/app/lib/auth-helpers";
import env from "@/app/lib/env";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Validate token exists and hasn't expired
    const tokenError = await validateTokenExpiration(
      verificationToken,
      async (t) => {
        await prisma.verificationToken.delete({ where: { id: t.id } });
      },
      "Invalid or expired verification token",
      400
    );
    if (tokenError) return tokenError;

    // At this point, verificationToken is guaranteed to be non-null
    const validToken = verificationToken!;

    // Check if email is already verified
    if (validToken.user.emailVerified) {
      // Delete the token since email is already verified
      await prisma.verificationToken.delete({
        where: { id: validToken.id },
      });

      return NextResponse.json(
        { success: false, message: "Email is already verified" },
        { status: 400 }
      );
    }

    // Update user's emailVerified field
    await prisma.user.update({
      where: { id: validToken.userId },
      data: { emailVerified: new Date() },
    });

    // Delete the verification token after successful verification
    await prisma.verificationToken.delete({
      where: { id: validToken.id },
    });

    // Check if user has a valid JWT token (logged in)
    const jwtToken = req.cookies.get("jwt")?.value;
    let isLoggedIn = false;

    if (jwtToken) {
      try {
        await verifyToken(jwtToken);
        isLoggedIn = true;
      } catch {
        // Invalid or expired token, treat as not logged in
        isLoggedIn = false;
      }
    }

    // Redirect based on authentication status
    const redirectUrl = isLoggedIn
      ? `${env.HOST_URL}/dashboard?verified=true`
      : `${env.HOST_URL}/?verified=true`;

    return NextResponse.redirect(redirectUrl);
  } catch (e: unknown) {
    const message = errorMessage(e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
