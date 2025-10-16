import { SignJWT, jwtVerify } from "jose";
import env from "@/app/lib/env";

const secretKey = env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

export const generateToken = async ({ userId }: { userId: string }) => {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encodedKey);
};

export const generateBearerToken = async ({
  clientId,
  orgId,
}: {
  clientId: string;
  orgId: string;
}) => {
  return new SignJWT({ clientId, orgId, type: "api" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encodedKey);
};

export const generateRefreshToken = async ({
  clientId,
}: {
  clientId: string;
}) => {
  return new SignJWT({ clientId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(encodedKey);
};

export const verifyToken = async (token: string) => {
  const { payload } = await jwtVerify(token, encodedKey, {
    algorithms: ["HS256"],
  });
  return payload;
};
