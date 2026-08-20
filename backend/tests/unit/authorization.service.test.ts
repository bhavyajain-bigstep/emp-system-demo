import { Types } from "mongoose";

import {
  requireAuthUser,
  assertCanReadEmployeeRecord,
  assertCanWriteEmployeeAttendance,
  assertCanApproveLeave,
  assertCanReadEmployee,
  findDirectReportIds,
} from "../../src/services/authorization.service";
import { AppError } from "../../src/errors/app-error";
import { Employee } from "../../src/models/employee.model";
import { Department } from "../../src/models/department.model";
import { setupTestDb } from "../helpers/test-db";
import { JwtPayload } from "../../src/types/auth.types";

setupTestDb();

const actorPayload = (
  userId: string,
  role: JwtPayload["role"],
  extras: Partial<JwtPayload> = {}
): JwtPayload => ({
  userId,
  employeeCode: `EMP-${userId.slice(-4)}`,
  role,
  ...extras,
});

const createDepartment = async () => {
  const dept = await Department.create({ name: "Test Dept" });
  return dept._id.toString();
};

const createEmployee = async (
  departmentId: string,
  overrides: Partial<{
    role: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
    managerId: string;
  }> = {}
) => {
  const employee = await Employee.create({
    employeeCode: `EMP-${new Types.ObjectId().toString().slice(-6)}`,
    name: "Test",
    email: `${new Types.ObjectId().toString().slice(-6)}@example.com`,
    passwordHash: "hash",
    role: overrides.role ?? "EMPLOYEE",
    departmentId: new Types.ObjectId(departmentId),
    managerId: overrides.managerId ? new Types.ObjectId(overrides.managerId) : undefined,
    joiningDate: new Date(),
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
  });
  return employee._id.toString();
};

describe("authorization.service", () => {
  describe("requireAuthUser", () => {
    it("throws when user is undefined", () => {
      expect(() => requireAuthUser(undefined)).toThrow(AppError);
    });

    it("returns the user when defined", () => {
      const user = actorPayload(new Types.ObjectId().toString(), "EMPLOYEE");
      expect(requireAuthUser(user)).toBe(user);
    });
  });

  describe("assertCanReadEmployee", () => {
    it("does not throw for any authenticated user", async () => {
      const user = actorPayload(new Types.ObjectId().toString(), "EMPLOYEE");
      await expect(assertCanReadEmployee(user)).resolves.toBeUndefined();
    });
  });

  describe("assertCanReadEmployeeRecord", () => {
    it("allows HR to read any record", async () => {
      const dept = await createDepartment();
      const empId = await createEmployee(dept);
      const hr = actorPayload(new Types.ObjectId().toString(), "HR");
      await expect(assertCanReadEmployeeRecord(hr, empId)).resolves.toBeUndefined();
    });

    it("allows ADMIN to read any record", async () => {
      const dept = await createDepartment();
      const empId = await createEmployee(dept);
      const admin = actorPayload(new Types.ObjectId().toString(), "ADMIN");
      await expect(assertCanReadEmployeeRecord(admin, empId)).resolves.toBeUndefined();
    });

    it("allows an employee to read their own record", async () => {
      const dept = await createDepartment();
      const empId = await createEmployee(dept);
      const self = actorPayload(empId, "EMPLOYEE");
      await expect(assertCanReadEmployeeRecord(self, empId)).resolves.toBeUndefined();
    });

    it("allows a manager to read a direct report", async () => {
      const dept = await createDepartment();
      const managerId = await createEmployee(dept, { role: "MANAGER" });
      const empId = await createEmployee(dept, { managerId });
      const manager = actorPayload(managerId, "MANAGER");
      await expect(assertCanReadEmployeeRecord(manager, empId)).resolves.toBeUndefined();
    });

    it("forbids a manager from reading an unrelated employee", async () => {
      const dept = await createDepartment();
      const otherId = await createEmployee(dept);
      const managerId = await createEmployee(dept, { role: "MANAGER" });
      const manager = actorPayload(managerId, "MANAGER");
      await expect(assertCanReadEmployeeRecord(manager, otherId)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403, code: "FORBIDDEN" })
      );
    });

    it("forbids an employee from reading a different employee", async () => {
      const dept = await createDepartment();
      const otherId = await createEmployee(dept);
      const userId = await createEmployee(dept);
      const user = actorPayload(userId, "EMPLOYEE");
      await expect(assertCanReadEmployeeRecord(user, otherId)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it("returns false for a malformed target id (manager check)", async () => {
      const managerId = await createDepartment();
      const manager = actorPayload(managerId, "MANAGER");
      await expect(assertCanReadEmployeeRecord(manager, "not-an-objectid")).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it("throws when no user is provided", async () => {
      await expect(assertCanReadEmployeeRecord(undefined, "507f1f77bcf86cd799439011")).rejects.toThrow(
        expect.objectContaining({ statusCode: 401 })
      );
    });
  });

  describe("assertCanWriteEmployeeAttendance", () => {
    it("allows HR to write for any employee", async () => {
      const dept = await createDepartment();
      const empId = await createEmployee(dept);
      const hr = actorPayload(new Types.ObjectId().toString(), "HR");
      await expect(assertCanWriteEmployeeAttendance(hr, empId)).resolves.toBeUndefined();
    });

    it("allows an employee to write only their own attendance", async () => {
      const dept = await createDepartment();
      const empId = await createEmployee(dept);
      const self = actorPayload(empId, "EMPLOYEE");
      await expect(assertCanWriteEmployeeAttendance(self, empId)).resolves.toBeUndefined();
    });

    it("forbids an employee from writing attendance for someone else", async () => {
      const dept = await createDepartment();
      const otherId = await createEmployee(dept);
      const userId = await createEmployee(dept);
      const user = actorPayload(userId, "EMPLOYEE");
      await expect(assertCanWriteEmployeeAttendance(user, otherId)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it("forbids a manager from writing attendance for reports (HR/Admin only)", async () => {
      const dept = await createDepartment();
      const managerId = await createEmployee(dept, { role: "MANAGER" });
      const empId = await createEmployee(dept, { managerId });
      const manager = actorPayload(managerId, "MANAGER");
      await expect(assertCanWriteEmployeeAttendance(manager, empId)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });
  });

  describe("assertCanApproveLeave", () => {
    it("allows HR to approve any leave", async () => {
      const hr = actorPayload(new Types.ObjectId().toString(), "HR");
      await expect(assertCanApproveLeave(hr, "x", null)).resolves.toBeUndefined();
    });

    it("allows the direct manager to approve", async () => {
      const managerId = new Types.ObjectId().toString();
      const manager = actorPayload(managerId, "MANAGER");
      await expect(assertCanApproveLeave(manager, "x", managerId)).resolves.toBeUndefined();
    });

    it("forbids a different manager from approving", async () => {
      const manager = actorPayload(new Types.ObjectId().toString(), "MANAGER");
      await expect(assertCanApproveLeave(manager, "x", new Types.ObjectId().toString())).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it("forbids a regular employee from approving", async () => {
      const user = actorPayload(new Types.ObjectId().toString(), "EMPLOYEE");
      await expect(assertCanApproveLeave(user, "x", null)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });
  });

  describe("findDirectReportIds", () => {
    it("returns direct reports of a manager", async () => {
      const dept = await createDepartment();
      const managerId = await createEmployee(dept, { role: "MANAGER" });
      const r1 = await createEmployee(dept, { managerId });
      const r2 = await createEmployee(dept, { managerId });
      await createEmployee(dept);

      const ids = await findDirectReportIds(managerId);
      expect(ids.sort()).toEqual([r1, r2].sort());
    });

    it("returns empty list for invalid manager id", async () => {
      const ids = await findDirectReportIds("not-a-valid-id");
      expect(ids).toEqual([]);
    });
  });
});
