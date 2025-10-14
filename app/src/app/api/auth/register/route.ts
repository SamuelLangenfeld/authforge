import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  let user;
  let credentials;
  try {
    const { email, password, name, orgName } = await req.json();
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
    await prisma.membership.create({
      data: {
        userId: user.id,
        roleId: role.id,
        orgId: org.id,
      },
    });
    user = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });
    const apiKey = randomBytes(16).toString("hex"); // client_id
    const apiSecret = randomBytes(32).toString("hex"); // client_secret
    const encodedAPISecret = await bcrypt.hash(apiKey, 10);
    await prisma.apiCredential.create({
      data: {
        orgId: org.id,
        clientId: apiKey,
        clientSecret: encodedAPISecret,
      },
    });
    credentials = { clientId: apiKey, clientSecret: apiSecret };
  } catch (e: unknown) {
    const message = errorMessage(e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: { user, credentials } });
}
