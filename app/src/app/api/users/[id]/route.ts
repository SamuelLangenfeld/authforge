import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../lib/db'

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

export async function GET(req: NextRequest, { params }: {params:  Promise<{ id: string }>}) {
  const { id } = await params
  // if (typeof id !== 'string') {
  //   return NextResponse.json({success: false, message: 'no user id'}, {status: 500})
  // }
  let user
  try {
    user = await prisma.user.findUnique({where: { id }})
  } catch (e) {
    const message = handleErrorMessage(e)
    return NextResponse.json({success: false, message}, {status: 500})
  }
  return NextResponse.json({ success: true, data: { user } })
}