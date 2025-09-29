import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../lib/db'


const handleErrorMessage = (e: unknown) => {
  let message
  if (e instanceof Error) {
    message = e.message
  }
  if (typeof e === 'string') {
    message = e
  } else {
    message = `Unexpected Error: ${e}`
  }
  return message
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
    const message = handleErrorMessage(e)
    return NextResponse.json({ success: false, message }, {status: 500})
  }
  return NextResponse.json({ success: true, message: `user: ${user?.email}` })
}

export async function GET(req: NextRequest) {
  let users
  try {
    users = await prisma.user.findMany()
  } catch (e) {
    const message = handleErrorMessage(e)
    return NextResponse.json({success: false, message}, {status: 500})
  }
  return NextResponse.json({ success: true, data: {users: users} })
}