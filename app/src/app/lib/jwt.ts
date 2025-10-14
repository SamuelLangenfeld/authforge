import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

export const generateToken = async ({ userId }: { userId: string }) => {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encodedKey);
};

export const generateBearerToken = async ({ clientId }: { clientId: string }) => {
  return new SignJWT({ clientId, type: 'api' })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(encodedKey);
};

export const generateRefreshToken = async ({ clientId }: { clientId: string }) => {
  return new SignJWT({ clientId, type: 'refresh' })
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
