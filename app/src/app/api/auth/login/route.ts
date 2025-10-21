import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { generateToken } from "@/app/lib/jwt";
import bcrypt from "bcryptjs";
import env from "@/app/lib/env";
import { loginSchema } from "@/app/lib/schemas";

const getCredentialError = () => {
  return NextResponse.json(
    { success: false, message: "invalid credentials" },
    { status: 401 }
  );
};

export async function POST(req: NextRequest) {
  let user;
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = loginSchema.safeParse(body);

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

    // Use validated data
    const { email, password } = validationResult.data;
    user = await prisma.user.findUnique({
      where: { email: email },
    });

    const success = await bcrypt.compare(
      password,
      user?.password ||
        "$2a$10$dummyhashtopreventtimingattack00000000000000000000000000"
    );

    if (!user || !user.password || !success) {
      return getCredentialError();
    }

    const token = await generateToken({ userId: user.id });

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set("jwt", token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (e: unknown) {
    const message = errorMessage(e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
