import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import { sendInvitationEmail } from "@/app/lib/email";
import {
  handleValidationError,
  handleRouteError,
  createErrorResponse,
  createSuccessMessageResponse,
} from "@/app/lib/route-helpers";
import { generateInvitationToken } from "@/app/lib/token-helpers";
import { sendInvitationSchema } from "@/app/lib/schemas";
import { validateOrgAccess } from "@/app/lib/auth-helpers";

/**
 * POST /api/organizations/[orgId]/invitations
 *
 * Admin sends an invitation to a user to join the organization.
 *
 * This route:
 * - Validates the requesting user is an admin of the organization
 * - Validates the email address
 * - Checks if an active invitation already exists for this email
 * - Generates a secure invitation token (7-day expiration)
 * - Stores the invitation in the database
 * - Sends an invitation email with the token
 * - Returns success message
 *
 * @param req - Request body should contain { email }
 * @param params - Route parameters including orgId
 * @returns JSON with success message
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return createErrorResponse("Unauthorized", 401);
    }

    // Validate user is admin of this organization
    const adminCheck = await validateOrgAccess(req, orgId);
    if (!adminCheck.valid) {
      return adminCheck.response!;
    }

    const body = await req.json();

    // Validate input
    const validationResult = sendInvitationSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { email } = validationResult.data;

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return createErrorResponse("Organization not found", 404);
    }

    // Check if user with this email already exists in the organization
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { orgId },
        },
      },
    });

    if (existingUser && existingUser.memberships.length > 0) {
      return createErrorResponse(
        "User is already a member of this organization",
        400
      );
    }

    // Check if an active invitation already exists for this email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        orgId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      return createErrorResponse(
        "An active invitation already exists for this email",
        400
      );
    }

    // Delete any expired invitations for this email
    await prisma.invitation.deleteMany({
      where: {
        email,
        orgId,
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    // Generate invitation token
    const { token, expiresAt } = generateInvitationToken();

    // Create invitation record
    await prisma.invitation.create({
      data: {
        token,
        email,
        orgId,
        createdBy: userId,
        expiresAt,
      },
    });

    // Send invitation email
    await sendInvitationEmail(email, organization.name, token);

    return createSuccessMessageResponse("Invitation sent successfully");
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
