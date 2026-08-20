import { Types } from "mongoose";
import { AppError } from "../errors/app-error";
import { EmployeeRole } from "../models/employee.model";
import { JwtPayload } from "../types/auth.types";
import {
  findDirectReportIds,
  getEmployeeManagerId,
} from "../repositories/employee.repository";

const isHrOrAdmin = (role: EmployeeRole): boolean =>
  role === "HR" || role === "ADMIN";

export const requireAuthUser = (
  user: JwtPayload | undefined
): JwtPayload => {
  if (!user) {
    throw new AppError(
      "Authentication required",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }
  return user;
};

const isDirectReportOf = async (
  actorId: string,
  employeeId: string
): Promise<boolean> => {
  if (!Types.ObjectId.isValid(employeeId)) return false;

  const managerId = await getEmployeeManagerId(employeeId);
  return managerId === actorId;
};

export const assertCanReadEmployee = async (
  actor: JwtPayload
): Promise<void> => {
  requireAuthUser(actor);
};

export const assertCanReadEmployeeRecord = async (
  actor: JwtPayload | undefined,
  targetEmployeeId: string
): Promise<void> => {
  const user = requireAuthUser(actor);

  if (isHrOrAdmin(user.role)) return;
  if (user.userId === targetEmployeeId) return;
  if (user.role === "MANAGER") {
    const isReport = await isDirectReportOf(user.userId, targetEmployeeId);
    if (isReport) return;
  }

  throw new AppError(
    "You do not have permission to access this employee",
    403,
    "FORBIDDEN"
  );
};

export const assertCanWriteEmployeeAttendance = async (
  actor: JwtPayload | undefined,
  targetEmployeeId: string
): Promise<void> => {
  const user = requireAuthUser(actor);

  if (isHrOrAdmin(user.role)) return;
  if (user.userId !== targetEmployeeId) {
    throw new AppError(
      "You cannot perform this action for another employee",
      403,
      "FORBIDDEN"
    );
  }
};

export const assertCanApproveLeave = async (
  actor: JwtPayload,
  requestEmployeeId: string,
  requesterManagerId: string | null | undefined
): Promise<void> => {
  const user = requireAuthUser(actor);

  if (isHrOrAdmin(user.role)) return;
  if (user.role === "MANAGER" && requesterManagerId === user.userId) {
    return;
  }

  throw new AppError(
    "Only the employee's manager or HR can approve this request",
    403,
    "FORBIDDEN"
  );
};

export { findDirectReportIds } from "../repositories/employee.repository";
