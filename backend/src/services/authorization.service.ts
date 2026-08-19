import { Types } from "mongoose";
import { AppError } from "../errors/app-error";
import { EmployeeRole, Employee } from "../models/employee.model";

export const assertCanAccessEmployee = async (
  actorId: string,
  actorRole: EmployeeRole,
  employeeId: string
): Promise<void> => {
  if (actorRole === "HR" || actorRole === "ADMIN" || actorId === employeeId) {
    return;
  }

  if (actorRole === "MANAGER" && Types.ObjectId.isValid(employeeId)) {
    const employee = await Employee.findById(employeeId).select("managerId");
    if (employee?.managerId?.toString() === actorId) return;
  }

  throw new AppError("You do not have permission to access this employee", 403, "FORBIDDEN");
};
