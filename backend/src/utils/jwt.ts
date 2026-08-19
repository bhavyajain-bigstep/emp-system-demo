import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.types";
import { env } from "../config/env";

const getJwtSecret = (): string => {
  return env.JWT_SECRET;
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
