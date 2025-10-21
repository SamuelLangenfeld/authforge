/**
 * Environment variable validation and configuration
 * Validates all required environment variables at application startup
 */

// Determine environment
const nodeEnv = process.env.NODE_ENV || "development";
const isDevelopment = nodeEnv === "development";

// Required environment variables that are always needed
const requiredEnvVars = ["JWT_SECRET", "HOST_URL", "RESEND_API_KEY", "FROM_EMAIL"] as const;

// Validate all required environment variables exist
requiredEnvVars.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(
      `Missing required environment variable: ${variable}. ` +
        `Please ensure it is set in your .env file.`
    );
  }
});

// Validate environment-specific DATABASE_URL
const databaseUrlVar = isDevelopment ? "DEV_DATABASE_URL" : "PROD_DATABASE_URL";
if (!process.env[databaseUrlVar]) {
  throw new Error(
    `Missing required environment variable: ${databaseUrlVar}. ` +
      `Please ensure it is set in your .env file for ${nodeEnv} environment.`
  );
}
const databaseUrl = process.env[databaseUrlVar]!;

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
  DATABASE_URL: databaseUrl,
  HOST_URL: hostUrl,
  RESEND_API_KEY: process.env.RESEND_API_KEY!,
  FROM_EMAIL: process.env.FROM_EMAIL!,
  NODE_ENV: nodeEnv,
} as const;

export default env;
