import { hash } from "bcrypt-ts";
import request from "supertest";
import type { Application } from "express";
import { Types } from "mongoose";

import { Department } from "../../src/models/department.model";
import { Employee } from "../../src/models/employee.model";
import { LeaveBalance } from "../../src/models/leave-balance.model";
import { LeaveType } from "../../src/models/leave-type.model";
import { LeaveRequest } from "../../src/models/leave-request.model";
import { Attendance } from "../../src/models/attendance.model";
import { Holiday } from "../../src/models/holiday.model";
import { AuditLog } from "../../src/models/audit-log.model";
import { ILeaveRules } from "../../src/models/leave-type.model";
import { EmployeeRole } from "../../src/models/employee.model";

const DEFAULT_PASSWORD = "Password123!";

export interface SeedDepartment {
  id: string;
  name: string;
}

export interface SeedEmployee {
  id: string;
  email: string;
  password: string;
  role: EmployeeRole;
  departmentId: string;
  managerId?: string;
  employeeCode: string;
}

export interface SeedLeaveType {
  id: string;
  code: string;
}

export interface SeedBalance {
  id: string;
}

export interface TestFixtures {
  department: SeedDepartment;
  admin: SeedEmployee;
  hr: SeedEmployee;
  manager: SeedEmployee;
  employee: SeedEmployee;
  otherEmployee: SeedEmployee;
  leaveType: SeedLeaveType;
  employeeBalance: SeedBalance;
}

export const clearAllCollections = async () => {
  await Promise.all([
    Department.deleteMany({}),
    Employee.deleteMany({}),
    LeaveBalance.deleteMany({}),
    LeaveType.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Attendance.deleteMany({}),
    Holiday.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
};

export const createDepartment = async (
  name = "Engineering"
): Promise<SeedDepartment> => {
  const department = await Department.create({ name });
  return { id: department._id.toString(), name: department.name };
};

export interface CreateEmployeeOptions {
  role?: EmployeeRole;
  managerId?: string;
  departmentId: string;
  email?: string;
  password?: string;
  employeeCode?: string;
  name?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  timezone?: string;
}

export const createEmployee = async (
  options: CreateEmployeeOptions
): Promise<SeedEmployee> => {
  const role = options.role ?? "EMPLOYEE";
  const password = options.password ?? DEFAULT_PASSWORD;
  const code = options.employeeCode ?? `EMP-${new Types.ObjectId().toString().slice(-6).toUpperCase()}`;
  const email = options.email ?? `${code.toLowerCase()}@example.com`;

  const passwordHash = await hash(password, 12);

  const employee = await Employee.create({
    employeeCode: code,
    name: options.name ?? `Test ${role}`,
    email,
    passwordHash,
    role,
    departmentId: new Types.ObjectId(options.departmentId),
    managerId: options.managerId ? new Types.ObjectId(options.managerId) : undefined,
    joiningDate: new Date(),
    timezone: options.timezone ?? "Asia/Kolkata",
    status: options.status ?? "ACTIVE",
  });

  return {
    id: employee._id.toString(),
    email,
    password,
    role,
    departmentId: options.departmentId,
    managerId: options.managerId,
    employeeCode: code,
  };
};

export const createLeaveType = async (
  overrides: Partial<{
    name: string;
    code: string;
    annualQuota: number;
    rules: Partial<ILeaveRules>;
  }> = {}
): Promise<SeedLeaveType> => {
  const code = overrides.code ?? "ANNUAL";
  const leaveType = await LeaveType.create({
    name: overrides.name ?? "Annual Leave",
    code,
    annualQuota: overrides.annualQuota ?? 20,
    rules: {
      allowNegativeBalance: false,
      excludeWeekends: true,
      excludeMandatoryHolidays: true,
      allowHalfDay: false,
      allowCancellation: true,
      maxConsecutiveDays: 10,
      minNoticeDays: 1,
      ...overrides.rules,
    },
    status: "ACTIVE",
  });

  return { id: leaveType._id.toString(), code: leaveType.code };
};

export const createLeaveBalance = async (
  employeeId: string,
  leaveTypeId: string,
  allocated: number,
  year: number = new Date().getFullYear()
): Promise<SeedBalance> => {
  const balance = await LeaveBalance.create({
    employeeId: new Types.ObjectId(employeeId),
    leaveTypeId: new Types.ObjectId(leaveTypeId),
    year,
    allocated,
    used: 0,
    available: allocated,
  });

  return { id: balance._id.toString() };
};

export const seedFixtures = async (): Promise<TestFixtures> => {
  const department = await createDepartment();

  const admin = await createEmployee({
    role: "ADMIN",
    departmentId: department.id,
    employeeCode: "EMP-ADMIN",
    email: "admin@example.com",
    name: "Admin User",
  });

  const hr = await createEmployee({
    role: "HR",
    departmentId: department.id,
    employeeCode: "EMP-HR",
    email: "hr@example.com",
    name: "HR User",
  });

  const manager = await createEmployee({
    role: "MANAGER",
    departmentId: department.id,
    employeeCode: "EMP-MGR",
    email: "manager@example.com",
    name: "Manager User",
  });

  const employee = await createEmployee({
    role: "EMPLOYEE",
    departmentId: department.id,
    managerId: manager.id,
    employeeCode: "EMP-001",
    email: "employee@example.com",
    name: "Employee User",
  });

  const otherEmployee = await createEmployee({
    role: "EMPLOYEE",
    departmentId: department.id,
    employeeCode: "EMP-002",
    email: "other@example.com",
    name: "Other Employee",
  });

  const leaveType = await createLeaveType({
    code: "ANNUAL",
    annualQuota: 20,
    rules: {
      allowNegativeBalance: false,
      excludeWeekends: true,
      excludeMandatoryHolidays: true,
      allowHalfDay: false,
      allowCancellation: true,
      maxConsecutiveDays: 10,
      minNoticeDays: 1,
    },
  });

  const employeeBalance = await createLeaveBalance(employee.id, leaveType.id, 20);

  return {
    department,
    admin,
    hr,
    manager,
    employee,
    otherEmployee,
    leaveType,
    employeeBalance,
  };
};

export const loginAs = async (
  app: Application,
  email: string,
  password: string = DEFAULT_PASSWORD
) => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`
    );
  }

  return res.body.data.accessToken as string;
};

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const agentFor = (app: Application, token: string) => {
  return {
    get: (path: string) =>
      request(app).get(path).set(authHeader(token)),
    post: (path: string, body?: unknown) =>
      request(app).post(path).set(authHeader(token)).send(body ?? {}),
    patch: (path: string, body?: unknown) =>
      request(app).patch(path).set(authHeader(token)).send(body ?? {}),
    put: (path: string, body?: unknown) =>
      request(app).put(path).set(authHeader(token)).send(body ?? {}),
    delete: (path: string) =>
      request(app).delete(path).set(authHeader(token)),
  };
};

export const DEFAULT_TEST_PASSWORD = DEFAULT_PASSWORD;
