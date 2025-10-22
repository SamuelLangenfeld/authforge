import { randomBytes } from "crypto";

/**
 * Configuration constants for tokens
 */
export const TOKEN_CONFIG = {
  VERIFICATION_TOKEN_EXPIRY_HOURS: 24,
  INVITATION_TOKEN_EXPIRY_DAYS: 7,
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
  API_CLIENT_ID_LENGTH: 16, // bytes
  API_CLIENT_SECRET_LENGTH: 32, // bytes
};

/**
 * Generates a verification token for email verification
 * Returns both the token and its expiration time
 */
export function generateVerificationToken(): {
  token: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(
    expiresAt.getHours() + TOKEN_CONFIG.VERIFICATION_TOKEN_EXPIRY_HOURS
  );
  return { token, expiresAt };
}

/**
 * Generates API credentials (clientId and clientSecret)
 * Used when creating new API clients for external SaaS applications
 */
export function generateApiCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  return {
    clientId: randomBytes(TOKEN_CONFIG.API_CLIENT_ID_LENGTH).toString("hex"),
    clientSecret: randomBytes(TOKEN_CONFIG.API_CLIENT_SECRET_LENGTH).toString(
      "hex"
    ),
  };
}

/**
 * Calculates the expiration date for refresh tokens
 */
export function getRefreshTokenExpiration(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS);
  return expiresAt;
}

/**
 * Generates an invitation token for organization invitations
 * Returns both the token and its expiration time
 */
export function generateInvitationToken(): {
  token: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() + TOKEN_CONFIG.INVITATION_TOKEN_EXPIRY_DAYS
  );
  return { token, expiresAt };
}
