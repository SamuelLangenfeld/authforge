import { z } from "zod";

/**
 * Validation schemas for API endpoints
 */

// User creation schema for SaaS CRUD API
export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// User update schema for SaaS CRUD API
export const updateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().min(1, "Name is required").max(255).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Query schema for filtering users
export const listUsersQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
