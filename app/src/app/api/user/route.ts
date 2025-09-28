import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient()
  }
  prisma = global.prisma
}
 
export async function POST(
  req: NextRequest,
) {
  let user
  try {
    const { email, password } = await req.json()
      user = await prisma.user.create({
        data: { email, password }
      })
  } catch (e: unknown) {
    let message
    if (e instanceof Error) {
      message = e.message
    }
    if (typeof e === 'string') {
      message = e
    } else {
      message = `Unexpected Error: ${e}`
    }
    return NextResponse.json({ success: false, message }, {status: 500})
  }
  return NextResponse.json({ success: true, message: `user: ${user?.email}` }, {status: 200})
}