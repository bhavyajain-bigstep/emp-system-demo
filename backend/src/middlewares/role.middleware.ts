import { Response, NextFunction } from "express";

import { AuthenticatedRequest } from "./auth.middleware";

import { EmployeeRole } from "../models/employee.model";
import { AppError } from "../errors/app-error";

export const authorize = (...allowedRoles: EmployeeRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required", 401, "AUTHENTICATION_REQUIRED"),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          403,
          "FORBIDDEN",
        ),
      );
    }

    next();
  };
};
