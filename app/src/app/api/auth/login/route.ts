export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { generateToken } from "@/app/lib/jwt";

const bcrypt = require("bcryptjs");

export async function POST(req: NextRequest) {
  let user;
  try {
    const { email, password } = await req.json();
    user = await prisma.user.findUnique({ where: { email: email } });
    if (!user) {
      const message = "no record of this email";
      return NextResponse.json({ success: false, message }, { status: 404 });
    }
    if (!user?.password) {
      const message = "password required";
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    const success = await bcrypt.compare(password, user.password);
    if (success) {
      const token = generateToken({ userId: user.id });
      const response = NextResponse.json({
        success: true,
        message: `user: ${user?.email}`,
      });
      response.cookies.set("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60,
      });
      return response;
    } else {
      const message = "incorrect password";
      console.log(message);
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
  } catch (e: unknown) {
    const message = errorMessage(e);
    console.log("error", errorMessage);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
