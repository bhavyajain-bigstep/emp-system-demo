import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.types";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return secret;
};

export const generateAccessToken = (
  payload: JwtPayload
): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "1d",
  });
};

export const verifyAccessToken = (
  token: string
): JwtPayload => {
  return jwt.verify(
    token,
    getJwtSecret()
  ) as JwtPayload;
};