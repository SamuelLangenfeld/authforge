import { NextResponse } from "next/server";
import prisma from "../../lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { headers } from "next/headers";

export async function GET() {
  let user;
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id") || "";
    user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: { user } });
  } catch (e: unknown) {
    const message = errorMessage(e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
