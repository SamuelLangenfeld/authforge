import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { userSelectForMemberList } from "@/app/lib/prisma-helpers";
import { createErrorResponse, handleRouteError, createSuccessResponse } from "@/app/lib/route-helpers";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await context.params;

    // Get the current user from headers (set by middleware)
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return createErrorResponse("Unauthorized", 401);
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
      return createErrorResponse("Not a member of this organization", 403);
    }

    if (membership.role.name !== "admin") {
      return createErrorResponse("Admin access required", 403);
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

    return createSuccessResponse({ members });
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
