import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { generateToken } from "@/app/lib/jwt";

/**
 *
 * @param req
 *
 *
 * this route provides both access and refresh token (initial gathering of credentials)
 * it checks for decoded API secret key
 * it creates access and refresh tokens. It stores the refresh in db for lookup later
 *
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
  try {
  } catch (e: unknown) {}
}
