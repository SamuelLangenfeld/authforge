import type { NextApiRequest, NextApiResponse } from 'next'
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


type ResponseData = {
  message: string,
  success: boolean
}
 
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {

  if (req.method === 'POST') {
    const { email, password } = req.body
    let user
    try {
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
      res.status(500).json({success: false, message})
    }
    res.status(200).json({ success: true, message: `user: ${user?.email}` })
  }
  if (req.method === 'GET') {
    console.log('huh')
    console.log(req.query)
  }
}