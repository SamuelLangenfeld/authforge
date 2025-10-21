import { hash as bcryptHash, compare as bcryptCompare } from "bcryptjs";

/**
 * Standardized password hashing
 * Uses bcryptjs with consistent salt rounds (10)
 * Replaces all direct hash() calls across the codebase
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptHash(password, 10);
}

/**
 * Standardized password comparison
 * Prevents timing attacks through constant-time comparison
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcryptCompare(password, hashedPassword);
}

/**
 * Dummy hash for timing attack prevention
 * Used when user is not found to avoid revealing user existence
 */
export const DUMMY_PASSWORD_HASH =
  "$2a$10$dummyhashtopreventtimingattack00000000000000000000000000";
