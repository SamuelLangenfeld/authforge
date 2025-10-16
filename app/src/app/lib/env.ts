const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL", "HOST_URL"] as const;

requiredEnvVars.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(`missing environment variable: ${variable}`);
  }
});

export default {
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  HOST_URL: process.env.HOST_URL,
  NODE_ENV: process.env.NODE_ENV,
};
