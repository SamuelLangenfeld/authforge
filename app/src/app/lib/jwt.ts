import jwt from "jsonwebtoken";

export const generateToken = ({ userId }: { userId: string }) => {
  const token = jwt.sign({ userId }, process.env.JWWT_SECRET as string, {
    expiresIn: "1h",
  });
  return token;
};

export const verifyToken = (token: string) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  return decoded;
};
