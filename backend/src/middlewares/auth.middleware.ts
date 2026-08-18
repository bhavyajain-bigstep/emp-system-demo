import {
  Request,
  Response,
  NextFunction,
} from "express";

import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../errors/app-error";
import { JwtPayload } from "../types/auth.types";

export interface AuthenticatedRequest
  extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      throw new AppError(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const [scheme, token] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      throw new AppError(
        "Invalid authorization header",
        401,
        "INVALID_AUTH_HEADER"
      );
    }

    const payload =
      verifyAccessToken(token);

    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};