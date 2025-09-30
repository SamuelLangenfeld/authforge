import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/db";
import errorMessage from "@/app/lib/errorMessage";

export async function POST(req: NextRequest) {
  let user;
  try {
    const { email, password, name, orgName } = await req.json();
    console.log("here", email, password, name, orgName);
    user = await prisma.user.create({
      data: { email, password, name },
    });
    const org = await prisma.organization.create({
      data: {
        name: orgName,
      },
    });
    const role = await prisma.role.create({
      data: {
        name: "admin",
      },
    });
    await prisma.role.create({
      data: {
        name: "user",
      },
    });
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        roleId: role.id,
        orgId: org.id,
      },
    });
    console.log(membership);
  } catch (e: unknown) {
    const message = errorMessage(e);
    console.log(message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: `user: ${user?.email}` });
}
