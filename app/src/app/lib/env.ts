/**
 * Environment variable validation and configuration
 * Validates all required environment variables at application startup
 */

const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL", "HOST_URL"] as const;

// Validate all required environment variables exist
requiredEnvVars.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(
      `Missing required environment variable: ${variable}. ` +
        `Please ensure it is set in your .env file.`
    );
  }
});

// Validate HOST_URL format
const hostUrl = process.env.HOST_URL!;
if (!/^https?:\/\/.+/.test(hostUrl)) {
  throw new Error(
    "HOST_URL must be a valid absolute URL starting with http:// or https://"
  );
}

// Export validated environment variables with proper types
const env = {
  JWT_SECRET: process.env.JWT_SECRET!,
  DATABASE_URL: process.env.DATABASE_URL!,
  HOST_URL: hostUrl,
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;

export default env;
