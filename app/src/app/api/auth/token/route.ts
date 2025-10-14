import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { generateBearerToken } from "@/app/lib/jwt";
import bcrypt from "bcryptjs";
/**
 *
 * @param req
 *
 *
 * this route provides both access and refresh token (initial gathering of credentials)
 * it checks for decoded API secret key
 * it creates access and refresh tokens. It stores the refresh in db for lookup later
 *
 * await prisma.apiCredential.create({
      data: {
        orgId: org.id,
        clientId: apiKey,
        clientSecret: encodedAPISecret,
      },
    });
    credentials = { clientId: apiKey, clientSecret: apiSecret };
 *
 * /token/refresh -> if json token doesn't work, they can use refresh token here and get new acess token
 *
 *
 * protected routes check for access token
*
* will need to create model for refresh token
 *
 * @returns
 */

export async function POST(req: NextRequest, res: NextResponse) {
  const { clientId, clientSecret } = await req.json();
  let apiCredential;
  try {
    apiCredential = await prisma.apiCredential.findUnique({
      where: { clientId },
    });
    if (!apiCredential) {
      const message = "no record of this api key";
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    const success = await bcrypt.compare(
      clientSecret,
      apiCredential.clientSecret
    );
    if (success) {
      const token = await generateBearerToken({ clientId });
      const refreshToken = await generateBearerToken({ clientId })
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          clientId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        },
      });
      return NextResponse.json({ access_token: token, token_type: "Bearer" });
    }
  } catch (e: unknown) {
    const message = errorMessage(e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
