import { z } from "zod";

/**
 * Centralized validation schemas for all API endpoints
 * Single source of truth for request validation across auth and SaaS CRUD operations
 */

// ============================================================================
// Authentication Schemas
// ============================================================================

/**
 * User login schema
 * POST /api/auth/login
 */
export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * User registration schema
 * POST /api/auth/register
 */
export const registerSchema = z.object({
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(72, "Password must be less than 72 characters"),
  name: z.string().min(1, "Name is required").max(100),
  orgName: z.string().min(1, "Organization name required").max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * API token exchange schema
 * POST /api/auth/token
 * Exchanges API credentials for access and refresh tokens
 */
export const tokenSchema = z.object({
  clientId: z
    .string()
    .min(1, "Client ID is required")
    .max(200, "Client ID is too long"),
  clientSecret: z
    .string()
    .min(1, "Client secret is required")
    .max(200, "Client secret is too long"),
});

export type TokenInput = z.infer<typeof tokenSchema>;

/**
 * Refresh token schema
 * POST /api/auth/refresh
 * Exchanges refresh token for new access token
 */
export const refreshSchema = z.object({
  refresh_token: z
    .string()
    .min(1, "Refresh token is required")
    .max(1000, "Refresh token is too long"),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

/**
 * Resend verification email schema
 * POST /api/auth/resend-verification
 */
export const resendVerificationSchema = z.object({
  email: z.email("Invalid email address"),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

/**
 * Forgot password schema
 * POST /api/auth/forgot-password
 * Requests a password reset email
 */
export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password schema
 * POST /api/auth/reset-password
 * Completes the password reset with a token and new password
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(72, "Password must be less than 72 characters"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Send invitation schema
 * POST /api/organizations/[orgId]/invitations
 * Admin invites a user to join their organization
 */
export const sendInvitationSchema = z.object({
  email: z.email("Invalid email address"),
});

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;

/**
 * Accept invitation schema
 * POST /api/invitations/accept
 * User accepts an invitation and either registers or joins existing account
 */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  name: z.string().min(1, "Name is required").max(100).optional(), // For registration
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(72, "Password must be less than 72 characters")
    .optional(), // For registration
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// ============================================================================
// SaaS CRUD API Schemas
// ============================================================================

/**
 * User creation schema for SaaS CRUD API
 * POST /api/organizations/[orgId]/users
 */
export const createUserSchema = z.object({
  email: z.email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * User update schema for SaaS CRUD API
 * PATCH /api/organizations/[orgId]/users/[userId]
 */
export const updateUserSchema = z.object({
  email: z.email("Invalid email format").optional(),
  name: z.string().min(1, "Name is required").max(255).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Query parameters schema for filtering users
 * GET /api/organizations/[orgId]/users
 */
export const listUsersQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
