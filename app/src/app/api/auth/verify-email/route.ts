import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { verifyToken } from "@/app/lib/jwt";
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

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (verificationToken.expiresAt < new Date()) {
      // Delete the expired token
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Verification token has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Check if email is already verified
    if (verificationToken.user.emailVerified) {
      // Delete the token since email is already verified
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });

      return NextResponse.json(
        { success: false, message: "Email is already verified" },
        { status: 400 }
      );
    }

    // Update user's emailVerified field
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    });

    // Delete the verification token after successful verification
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
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
