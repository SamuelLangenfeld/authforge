import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { userSelectForMemberList } from "@/app/lib/prisma-helpers";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await context.params;

    // Get the current user from headers (set by middleware)
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if the user is a member of this organization and has admin role
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        orgId,
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "Not a member of this organization" },
        { status: 403 }
      );
    }

    if (membership.role.name !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch all members of the organization
    const members = await prisma.membership.findMany({
      where: {
        orgId,
      },
      include: {
        user: {
          select: userSelectForMemberList,
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (e: unknown) {
    const message = errorMessage(e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
