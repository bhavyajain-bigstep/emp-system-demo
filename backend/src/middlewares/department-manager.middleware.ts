import { Response, NextFunction } from "express";
import { Types } from "mongoose";

import { AuthenticatedRequest } from "./auth.middleware";
import { AppError } from "../errors/app-error";
import { Department } from "../models/department.model";

export const authorizeDepartmentManager = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const departmentId = req.params.id as string;

    if (!departmentId || !Types.ObjectId.isValid(departmentId)) {
      return next(
        new AppError("Invalid department ID", 400, "INVALID_DEPARTMENT_ID"),
      );
    }

    if (!req.user) {
      return next(
        new AppError("Authentication required", 401, "AUTHENTICATION_REQUIRED"),
      );
    }

    const department = await Department.findById(departmentId);

    if (!department) {
      return next(
        new AppError("Department not found", 404, "DEPARTMENT_NOT_FOUND"),
      );
    }

    const isDepartmentManager =
      department.managerId &&
      department.managerId.toString() === req.user!.userId;

    if (!isDepartmentManager) {
      return next(
        new AppError(
          "You are not authorized to update this department",
          403,
          "NOT_DEPARTMENT_MANAGER",
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
