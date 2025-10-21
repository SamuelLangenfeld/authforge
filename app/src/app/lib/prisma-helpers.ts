/**
 * Prisma helper utilities for safe data selection
 * Prevents accidental exposure of sensitive fields like password hashes
 */

import { Prisma } from "@prisma/client";

/**
 * User selection without password field
 * Use this in all queries that return user data to API responses or client components
 */
export const userSelectWithoutPassword = {
  id: true,
  email: true,
  name: true,
  emailVerified: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

/**
 * User selection with memberships (excluding password)
 * Common pattern for dashboard and user profile pages
 */
export const userWithMembershipsSelect = {
  id: true,
  email: true,
  name: true,
  emailVerified: true,
  createdAt: true,
  memberships: {
    include: {
      organization: true,
      role: true,
    },
  },
} as const satisfies Prisma.UserSelect;

/**
 * User selection for member lists (minimal fields for privacy)
 * Use when displaying lists of users (e.g., organization members)
 */
export const userSelectForMemberList = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
} as const satisfies Prisma.UserSelect;
