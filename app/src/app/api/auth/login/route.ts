import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { generateToken } from "@/app/lib/jwt";
import { setJwtCookie } from "@/app/lib/cookie-helpers";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/app/lib/schemas";
import { handleValidationError, createErrorResponse } from "@/app/lib/route-helpers";

const getCredentialError = () => {
  return createErrorResponse("invalid credentials", 401);
};

export async function POST(req: NextRequest) {
  let user;
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = loginSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    // Use validated data (type-safe after validation check)
    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
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

    setJwtCookie(response, token);

    return response;
  } catch {
    return createErrorResponse("Internal server error", 500);
  }
}
