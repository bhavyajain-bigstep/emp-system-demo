import { EmployeeRole } from "../models/employee.model";

export interface JwtPayload {
  userId: string;
  employeeCode: string;
  role: EmployeeRole;
  departmentId?: string;
  managerId?: string;
}