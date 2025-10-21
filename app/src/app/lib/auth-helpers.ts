import { NextRequest, NextResponse } from "next/server";
import prisma from "./db";

/**
 * Authentication helpers for API endpoints
 * Extracts and validates organization context for SaaS CRUD operations
 */

export interface ApiAuthContext {
  orgId: string;
  clientId: string;
}

/**
 * Extracts API authentication context from request headers
 * These headers are set by the middleware after validating the Bearer token
 */
export function extractApiAuthContext(
  request: NextRequest
): ApiAuthContext | null {
  const orgId = request.headers.get("x-org-id");
  const clientId = request.headers.get("x-client-id");

  if (!orgId || !clientId) {
    return null;
  }

  return { orgId, clientId };
}

/**
 * Validates that the API client is authenticated and has access to the organization
 * Returns the auth context or an error response
 */
export async function validateApiAuth(request: NextRequest) {
  const authContext = extractApiAuthContext(request);

  if (!authContext) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Unauthorized - Missing API credentials" },
        { status: 401 }
      ),
    };
  }

  // Verify that the organization exists
  const organization = await prisma.organization.findUnique({
    where: { id: authContext.orgId },
  });

  if (!organization) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      ),
    };
  }

  // Verify that the API credential exists and belongs to this organization
  const credential = await prisma.apiCredential.findUnique({
    where: { clientId: authContext.clientId },
  });

  if (!credential || credential.orgId !== authContext.orgId) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Unauthorized - Invalid credentials" },
        { status: 401 }
      ),
    };
  }

  return {
    valid: true,
    authContext,
  };
}

/**
 * Checks if a user exists in the organization
 */
export async function userExistsInOrg(
  userId: string,
  orgId: string
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      orgId,
    },
  });

  return !!membership;
}

/**
 * Ensures a user belongs to the organization
 * Returns the user or null if not found in org
 */
export async function getUserInOrg(userId: string, orgId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      orgId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
        },
      },
    },
  });

  return membership?.user || null;
}

/**
 * Validates organization access for API requests
 * Combines API auth validation with org ID matching in one helper
 * Eliminates repeated pattern across organization routes
 */
export async function validateOrgAccess(
  request: NextRequest,
  orgId: string
) {
  const authValidation = await validateApiAuth(request);

  if (!authValidation.valid) {
    return { valid: false, response: authValidation.response };
  }

  // Ensure the organization ID matches the authenticated org
  if (authValidation.authContext!.orgId !== orgId) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Unauthorized - Cannot access other organizations" },
        { status: 403 }
      ),
    };
  }

  return {
    valid: true,
    authContext: authValidation.authContext,
  };
}
