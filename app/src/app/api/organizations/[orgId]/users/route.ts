import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { userSelectWithoutPassword } from "@/app/lib/prisma-helpers";
import {
  validateOrgAccess,
  userExistsInOrg,
} from "@/app/lib/auth-helpers";
import {
  createUserSchema,
  listUsersQuerySchema,
} from "@/app/lib/schemas";
import { handleValidationError, handleQueryValidationError, handleRouteError, createConflictError, createSuccessResponse, createSuccessMessageResponse } from "@/app/lib/route-helpers";
import { hashPassword } from "@/app/lib/crypto-helpers";

/**
 * GET /api/organizations/[orgId]/users
 * List all users in an organization
 * Query parameters: skip, take, search
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await context.params;

    // Validate organization access
    const authValidation = await validateOrgAccess(request, orgId);
    if (!authValidation.valid) {
      return authValidation.response!;
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = listUsersQuerySchema.safeParse({
      skip: searchParams.get("skip"),
      take: searchParams.get("take"),
      search: searchParams.get("search"),
    });

    const queryError = handleQueryValidationError(queryResult);
    if (queryError) return queryError;

    if (!queryResult.success) {
      throw new Error("Query validation should have been caught earlier");
    }
    const { skip, take, search } = queryResult.data;

    // Build search filter
    const searchFilter = search
      ? {
          OR: [
            { user: { email: { contains: search, mode: "insensitive" as const } } },
            { user: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    // Get total count
    const total = await prisma.membership.count({
      where: {
        orgId,
        ...searchFilter,
      },
    });

    // Fetch users
    const memberships = await prisma.membership.findMany({
      where: {
        orgId,
        ...searchFilter,
      },
      include: {
        user: {
          select: userSelectWithoutPassword,
        },
      },
      orderBy: {
        user: {
          createdAt: "desc",
        },
      },
      skip,
      take,
    });

    const users = memberships.map((m) => m.user);

    return createSuccessResponse({
      users,
      pagination: {
        skip,
        take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}

/**
 * POST /api/organizations/[orgId]/users
 * Create a new user in the organization
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await context.params;

    // Validate organization access
    const authValidation = await validateOrgAccess(request, orgId);
    if (!authValidation.valid) {
      return authValidation.response!;
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createUserSchema.safeParse(body);

    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { email, name, password } = validationResult.data;

    // Check if user already exists globally
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createConflictError("User with this email already exists");
    }

    // Check if user already exists in organization
    const existingMembership = await prisma.membership.findFirst({
      where: {
        orgId,
        user: { email },
      },
    });

    if (existingMembership) {
      return createConflictError("User already exists in this organization");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get or create "user" role
    let userRole = await prisma.role.findFirst({
      where: { name: "user" },
    });

    if (!userRole) {
      userRole = await prisma.role.create({
        data: { name: "user" },
      });
    }

    // Create user with membership
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: new Date(), // Mark as verified since it's created via API
        memberships: {
          create: {
            orgId,
            roleId: userRole.id,
          },
        },
      },
      select: userSelectWithoutPassword,
    });

    return createSuccessMessageResponse("User created successfully", newUser, 201);
  } catch (e: unknown) {
    return handleRouteError(e);
  }
}
