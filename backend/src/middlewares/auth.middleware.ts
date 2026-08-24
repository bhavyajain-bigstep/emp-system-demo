import { Request, Response, NextFunction } from "express";

import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../errors/app-error";
import { JwtPayload } from "../types/auth.types";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    // Try Authorization header first (for backward compat / API clients)
    const authorization = req.headers.authorization;

    // Fallback to HttpOnly cookie
    const cookieToken = req.cookies?.accessToken;

    const token = authorization
      ? authorization.split(" ")[1]
      : cookieToken;

    if (!token) {
      throw new AppError(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    if (authorization && !authorization.startsWith("Bearer ")) {
      throw new AppError(
        "Invalid authorization header",
        401,
        "INVALID_AUTH_HEADER",
      );
    }

    const payload = verifyAccessToken(token);

    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};
