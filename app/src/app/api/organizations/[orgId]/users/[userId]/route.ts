import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { userSelectWithoutPassword } from "@/app/lib/prisma-helpers";
import {
  validateOrgAccess,
  getUserInOrg,
} from "@/app/lib/auth-helpers";
import { updateUserSchema } from "@/app/lib/schemas";
import { handleValidationError, handleRouteError, createConflictError, createNotFoundError, createSuccessResponse, createSuccessMessageResponse } from "@/app/lib/route-helpers";
import { hashPassword } from "@/app/lib/crypto-helpers";

/**
 * GET /api/organizations/[orgId]/users/[userId]
 * Get a specific user in the organization
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await context.params;

    // Validate organization access
    const authValidation = await validateOrgAccess(request, orgId);
    if (!authValidation.valid) {
      return authValidation.response!;
    }

    // Get user from organization
    const user = await getUserInOrg(userId, orgId);

    if (!user) {
      return createNotFoundError("User not found in this organization");
    }

    return createSuccessResponse(user);
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}

/**
 * PATCH /api/organizations/[orgId]/users/[userId]
 * Update a user in the organization
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await context.params;

    // Validate organization access
    const authValidation = await validateOrgAccess(request, orgId);
    if (!authValidation.valid) {
      return authValidation.response!;
    }

    // Verify user exists in organization
    const existingUser = await getUserInOrg(userId, orgId);
    if (!existingUser) {
      return createNotFoundError("User not found in this organization");
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateUserSchema.safeParse(body);

    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { email, name, password } = validationResult.data;

    // Build update data
    const updateData: Record<string, string> = {};
    if (email !== undefined) {
      // Check if email is not already used by another user
      const otherUserWithEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (otherUserWithEmail && otherUserWithEmail.id !== userId) {
        return createConflictError("Email is already in use");
      }
      updateData.email = email;
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    if (password !== undefined) {
      updateData.password = await hashPassword(password);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: userSelectWithoutPassword,
    });

    return createSuccessMessageResponse("User updated successfully", updatedUser);
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}

/**
 * DELETE /api/organizations/[orgId]/users/[userId]
 * Delete a user from the organization
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await context.params;

    // Validate organization access
    const authValidation = await validateOrgAccess(request, orgId);
    if (!authValidation.valid) {
      return authValidation.response!;
    }

    // Verify user exists in organization
    const membership = await prisma.membership.findFirst({
      where: { userId, orgId },
    });

    if (!membership) {
      return createNotFoundError("User not found in this organization");
    }

    // Delete the membership (this removes the user from the organization)
    await prisma.membership.delete({
      where: { id: membership.id },
    });

    // If user has no other memberships, optionally delete the user account
    // Uncomment the code below if you want to delete users with no organizations
    /*
    const otherMemberships = await prisma.membership.count({
      where: { userId },
    });

    if (otherMemberships === 0) {
      await prisma.user.delete({
        where: { id: userId },
      });
    }
    */

    return createSuccessMessageResponse("User removed from organization");
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
