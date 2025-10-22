import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { hashPassword } from "@/app/lib/crypto-helpers";
import {
  handleValidationError,
  handleRouteError,
  createErrorResponse,
} from "@/app/lib/route-helpers";
import { acceptInvitationSchema } from "@/app/lib/schemas";

const invalidMessage = "Invalid or expired invitation token";

/**
 * POST /api/invitations/accept
 *
 * Accepts an organization invitation by validating the token and adding the user to the organization.
 * If the user doesn't have an account, one will be created.
 *
 * This route:
 * - Validates the invitation token
 * - Verifies the token hasn't expired
 * - Finds or creates the user account
 * - Adds the user to the organization with the "user" role
 * - Deletes the used invitation
 * - Returns success with user and organization information
 *
 * @param req - Request body should contain { token, name?, password? }
 *             name and password required if user doesn't exist
 * @returns JSON with user, organization, and success message
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validationResult = acceptInvitationSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { token, name, password } = validationResult.data;

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return createErrorResponse(invalidMessage, 400);
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      // Clean up expired invitation
      await prisma.invitation.delete({
        where: { id: invitation.id },
      });
      return createErrorResponse(invalidMessage, 400);
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user) {
      // Creating new user - name and password are required
      if (!name || !password) {
        return createErrorResponse(
          "Name and password are required for new accounts",
          400
        );
      }

      const hashedPassword = await hashPassword(password);

      user = await prisma.user.create({
        data: {
          email: invitation.email,
          name,
          password: hashedPassword,
          emailVerified: new Date(), // Auto-verify invited users
        },
      });
    }

    // Check if user is already a member of this organization
    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: invitation.orgId,
      },
    });

    if (existingMembership) {
      // Delete invitation and return success (user already a member)
      await prisma.invitation.delete({
        where: { id: invitation.id },
      });

      return NextResponse.json({
        success: true,
        message: "User is already a member of this organization",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          organization: {
            id: invitation.organization.id,
            name: invitation.organization.name,
          },
        },
      });
    }

    // Get the "user" role (non-admin)
    const userRole = await prisma.role.findFirst({
      where: { name: "user" },
    });

    if (!userRole) {
      throw new Error("User role not found in database");
    }

    // Create membership to add user to organization
    await prisma.membership.create({
      data: {
        userId: user.id,
        orgId: invitation.orgId,
        roleId: userRole.id,
      },
    });

    // Delete the used invitation
    await prisma.invitation.delete({
      where: { id: invitation.id },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully joined organization",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
        },
      },
    });
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
