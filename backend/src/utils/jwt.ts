import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../types/auth.types";

export const generateAccessToken = (
  payload: JwtPayload
): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyAccessToken = (
  token: string
): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

export const generateRefreshToken = (payload: { userId: string }): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
};