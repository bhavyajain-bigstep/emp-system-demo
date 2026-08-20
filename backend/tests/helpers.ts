import { hash } from "bcrypt";
import { Types } from "mongoose";

import { Employee, EmployeeRole, IEmployee } from "../src/models/employee.model";
import { Department, IDepartment } from "../src/models/department.model";
import { LeaveType, ILeaveType } from "../src/models/leave-type.model";
import { LeaveBalance } from "../src/models/leave-balance.model";
import { Holiday } from "../src/models/holiday.model";
import { generateAccessToken } from "../src/utils/jwt";
import { JwtPayload } from "../src/types/auth.types";

export const TEST_PASSWORD = "Password@123";

interface SeedEmployeeOptions {
  employeeCode?: string;
  name?: string;
  email?: string;
  role?: EmployeeRole;
  departmentId?: Types.ObjectId;
  managerId?: Types.ObjectId | null;
  password?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export const seedDepartment = async (name: string): Promise<IDepartment> => {
  return Department.create({ name });
};

export const seedEmployee = async (
  options: SeedEmployeeOptions = {}
): Promise<IEmployee> => {
  const passwordHash = await hash(
    options.password ?? TEST_PASSWORD,
    10
  );

  return Employee.create({
    employeeCode:
      options.employeeCode ?? `EMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: options.name ?? "Test User",
    email:
      options.email ??
      `user-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`,
    passwordHash,
    role: options.role ?? "EMPLOYEE",
    departmentId: options.departmentId,
    managerId: options.managerId ?? undefined,
    joiningDate: new Date("2026-01-01"),
    timezone: "Asia/Kolkata",
    status: options.status ?? "ACTIVE",
  });
};

export const tokenFor = (employee: IEmployee): string => {
  const payload: JwtPayload = {
    userId: employee._id.toString(),
    employeeCode: employee.employeeCode,
    role: employee.role,
    departmentId: employee.departmentId
      ? employee.departmentId.toString()
      : undefined,
    managerId: employee.managerId
      ? employee.managerId.toString()
      : undefined,
  };

  return generateAccessToken(payload);
};

export const seedLeaveType = async (
  overrides: Partial<Pick<ILeaveType, "name" | "code" | "annualQuota" | "status">> & {
    rules?: Partial<ILeaveType["rules"]>;
  } = {}
): Promise<ILeaveType> => {
  return LeaveType.create({
    name: overrides.name ?? "Casual Leave",
    code: overrides.code ?? `CL-${Math.floor(Math.random() * 10000)}`,
    annualQuota: overrides.annualQuota ?? 12,
    rules: {
      allowNegativeBalance: false,
      excludeWeekends: true,
      excludeMandatoryHolidays: true,
      allowHalfDay: true,
      allowCancellation: true,
      maxConsecutiveDays: 5,
      minNoticeDays: 0,
      ...(overrides.rules ?? {}),
    },
    status: overrides.status ?? "ACTIVE",
  });
};

export const seedLeaveBalance = async (
  employeeId: Types.ObjectId,
  leaveTypeId: Types.ObjectId,
  year = 2026,
  allocated = 12
) => {
  return LeaveBalance.create({
    employeeId,
    leaveTypeId,
    year,
    allocated,
    used: 0,
    available: allocated,
  });
};

export const seedHoliday = async (
  date: Date,
  name = "Test Holiday",
  optional = false
) => {
  return Holiday.create({ date, name, optional });
};

export const toISO = (date: Date): string => date.toISOString();