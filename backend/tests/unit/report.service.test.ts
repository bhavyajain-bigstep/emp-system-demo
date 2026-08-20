import { Types } from "mongoose";
import { Readable } from "stream";

import {
  getAttendanceReportService,
  exportAttendanceReportCsv,
  streamAttendanceReportCsv,
  getLeaveReportService,
  exportLeaveReportCsv,
  streamLeaveReportCsv,
} from "../../src/services/report.service";
import { Attendance } from "../../src/models/attendance.model";
import { Department } from "../../src/models/department.model";
import { Employee } from "../../src/models/employee.model";
import { LeaveRequest } from "../../src/models/leave-request.model";
import { LeaveType } from "../../src/models/leave-type.model";
import { setupTestDb } from "../helpers/test-db";
import { AppError } from "../../src/errors/app-error";

setupTestDb();

const createDepartment = async (name = "Engineering") => {
  const dept = await Department.create({ name });
  return dept;
};

const createEmployee = async (
  departmentId: Types.ObjectId,
  role: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN" = "EMPLOYEE",
  managerId?: Types.ObjectId
) => {
  return Employee.create({
    employeeCode: `EMP-${new Types.ObjectId().toString().slice(-6)}`,
    name: "Test",
    email: `${new Types.ObjectId().toString().slice(-6)}@example.com`,
    passwordHash: "hash",
    role,
    departmentId,
    managerId,
    joiningDate: new Date(),
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
  });
};

const createLeaveType = async () => {
  return LeaveType.create({
    name: "Annual",
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
    status: "ACTIVE",
  });
};

const collectStream = async (stream: Readable): Promise<string> => {
  let result = "";
  for await (const chunk of stream) {
    result += chunk.toString();
  }
  return result;
};

describe("report.service", () => {
  describe("getAttendanceReportService", () => {
    it("scopes results to the authenticated EMPLOYEE", async () => {
      const dept = await createDepartment();
      const emp1 = await createEmployee(dept._id);
      const emp2 = await createEmployee(dept._id);

      await Attendance.create({
        employeeId: emp1._id,
        date: "2026-08-20",
        checkInAt: new Date("2026-08-20T03:00:00Z"),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });
      await Attendance.create({
        employeeId: emp2._id,
        date: "2026-08-20",
        checkInAt: new Date("2026-08-20T03:00:00Z"),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const result = await getAttendanceReportService(
        {},
        1,
        20,
        { userId: emp1._id.toString(), role: "EMPLOYEE" }
      );

      expect(result.records.length).toBe(1);
      expect(result.total).toBe(1);
    });

    it("scopes MANAGER to themselves + direct reports", async () => {
      const dept = await createDepartment();
      const manager = await createEmployee(dept._id, "MANAGER");
      const report = await createEmployee(dept._id, "EMPLOYEE", manager._id);
      const unrelated = await createEmployee(dept._id);

      await Attendance.create({
        employeeId: manager._id,
        date: "2026-08-20",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });
      await Attendance.create({
        employeeId: report._id,
        date: "2026-08-20",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });
      await Attendance.create({
        employeeId: unrelated._id,
        date: "2026-08-20",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const result = await getAttendanceReportService(
        {},
        1,
        20,
        { userId: manager._id.toString(), role: "MANAGER" }
      );

      expect(result.records.length).toBe(2);
    });

    it("forbids MANAGER from requesting another department's employee", async () => {
      const dept1 = await createDepartment("Eng");
      const dept2 = await createDepartment("Sales");
      const manager = await createEmployee(dept1._id, "MANAGER");
      const unrelated = await createEmployee(dept2._id);

      await expect(
        getAttendanceReportService(
          { employeeId: unrelated._id.toString() },
          1,
          20,
          { userId: manager._id.toString(), role: "MANAGER" }
        )
      ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));
    });

    it("formats working hours/minutes and isLate flag", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);
      await Attendance.create({
        employeeId: emp._id,
        date: "2026-08-20",
        checkInAt: new Date("2026-08-20T03:00:00Z"),
        checkOutAt: new Date("2026-08-20T11:00:00Z"),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const result = await getAttendanceReportService(
        {},
        1,
        20,
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );
      expect(result.records[0].workingMinutes).toBe(480);
      expect(result.records[0].workingHours).toBe(8);
      expect(result.records[0].isLate).toBe(false);
    });

    it("marks LATE status as late", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);
      await Attendance.create({
        employeeId: emp._id,
        date: "2026-08-20",
        checkInAt: new Date(),
        status: "LATE",
        timezone: "Asia/Kolkata",
      });

      const result = await getAttendanceReportService(
        {},
        1,
        20,
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );
      expect(result.records[0].isLate).toBe(true);
    });

    it("filters by date range", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);
      await Attendance.create({
        employeeId: emp._id,
        date: "2026-08-10",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });
      await Attendance.create({
        employeeId: emp._id,
        date: "2026-08-25",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const result = await getAttendanceReportService(
        { from: "2026-08-15", to: "2026-08-31" },
        1,
        20,
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );

      expect(result.records.length).toBe(1);
      expect(result.records[0].date).toBe("2026-08-25");
    });

    it("returns empty results when no records match", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);

      const result = await getAttendanceReportService(
        { from: "2030-01-01", to: "2030-01-31" },
        1,
        20,
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );

      expect(result.records).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("exportAttendanceReportCsv", () => {
    it("returns a CSV with a header row", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);
      await Attendance.create({
        employeeId: emp._id,
        date: "2026-08-20",
        checkInAt: new Date("2026-08-20T03:00:00Z"),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const csv = await exportAttendanceReportCsv(
        {},
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );

      expect(csv).toContain("Employee Code");
      expect(csv).toContain("Date");
      expect(csv.split("\n").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("streamAttendanceReportCsv", () => {
    it("produces a stream of CSV chunks", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);
      await Attendance.create({
        employeeId: emp._id,
        date: "2026-08-20",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const stream = streamAttendanceReportCsv(
        {},
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );

      const csv = await collectStream(stream);
      expect(csv).toContain("Employee Code");
    });
  });

  describe("getLeaveReportService", () => {
    it("returns paginated leave records scoped by role", async () => {
      const dept = await createDepartment();
      const emp1 = await createEmployee(dept._id);
      const emp2 = await createEmployee(dept._id);
      const leaveType = await createLeaveType();

      await LeaveRequest.create({
        employeeId: emp1._id,
        leaveTypeId: leaveType._id,
        fromDate: new Date("2026-09-01"),
        toDate: new Date("2026-09-02"),
        days: 2,
        reason: "vacation",
        status: "PENDING",
      });
      await LeaveRequest.create({
        employeeId: emp2._id,
        leaveTypeId: leaveType._id,
        fromDate: new Date("2026-09-01"),
        toDate: new Date("2026-09-02"),
        days: 2,
        reason: "vacation",
        status: "PENDING",
      });

      const result = await getLeaveReportService(
        {},
        1,
        20,
        { userId: emp1._id.toString(), role: "EMPLOYEE" }
      );

      expect(result.records.length).toBe(1);
    });

    it("filters by status and leaveTypeId", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);
      const lt1 = await createLeaveType();
      const lt2 = await LeaveType.create({
        name: "Sick",
        code: "SICK",
        annualQuota: 10,
        rules: {
          allowNegativeBalance: false,
          excludeWeekends: true,
          excludeMandatoryHolidays: true,
          allowHalfDay: true,
          allowCancellation: true,
          maxConsecutiveDays: 5,
          minNoticeDays: 0,
        },
        status: "ACTIVE",
      });

      await LeaveRequest.create({
        employeeId: emp._id,
        leaveTypeId: lt1._id,
        fromDate: new Date("2026-09-01"),
        toDate: new Date("2026-09-02"),
        days: 2,
        reason: "annual",
        status: "APPROVED",
      });
      await LeaveRequest.create({
        employeeId: emp._id,
        leaveTypeId: lt2._id,
        fromDate: new Date("2026-09-10"),
        toDate: new Date("2026-09-11"),
        days: 2,
        reason: "sick",
        status: "PENDING",
      });

      const approved = await getLeaveReportService(
        { status: "APPROVED" },
        1,
        20,
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );
      expect(approved.records.length).toBe(1);
      expect(approved.records[0].status).toBe("APPROVED");

      const sick = await getLeaveReportService(
        { leaveTypeId: lt2._id.toString() },
        1,
        20,
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );
      expect(sick.records.length).toBe(1);
    });

    it("supports date range filtering using overlap semantics", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);
      const lt = await createLeaveType();

      // Leave that does NOT overlap with [Sep 1, Sep 10]
      await LeaveRequest.create({
        employeeId: emp._id,
        leaveTypeId: lt._id,
        fromDate: new Date("2026-09-15"),
        toDate: new Date("2026-09-20"),
        days: 4,
        reason: "vacation",
        status: "PENDING",
      });
      // Leave that DOES overlap with [Sep 1, Sep 10]
      await LeaveRequest.create({
        employeeId: emp._id,
        leaveTypeId: lt._id,
        fromDate: new Date("2026-09-05"),
        toDate: new Date("2026-09-08"),
        days: 4,
        reason: "trip",
        status: "PENDING",
      });

      const result = await getLeaveReportService(
        { from: "2026-09-01", to: "2026-09-10" },
        1,
        20,
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );
      expect(result.records.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe("exportLeaveReportCsv / streamLeaveReportCsv", () => {
    it("returns CSV string and stream", async () => {
      const dept = await createDepartment();
      const emp = await createEmployee(dept._id);
      const lt = await createLeaveType();
      await LeaveRequest.create({
        employeeId: emp._id,
        leaveTypeId: lt._id,
        fromDate: new Date("2026-09-01"),
        toDate: new Date("2026-09-02"),
        days: 2,
        reason: "vacation",
        status: "PENDING",
      });

      const csv = await exportLeaveReportCsv(
        {},
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );
      expect(csv).toContain("Leave ID");
      expect(csv).toContain("Annual");

      const stream = streamLeaveReportCsv(
        {},
        { userId: emp._id.toString(), role: "EMPLOYEE" }
      );
      const collected = await collectStream(stream);
      expect(collected).toContain("Leave ID");
    });
  });

  it("throws AppError with 403 when MANAGER queries outside their team", async () => {
    const dept = await createDepartment();
    const manager = await createEmployee(dept._id, "MANAGER");
    const stranger = await createEmployee(dept._id);

    await expect(
      getLeaveReportService(
        { employeeId: stranger._id.toString() },
        1,
        20,
        { userId: manager._id.toString(), role: "MANAGER" }
      )
    ).rejects.toBeInstanceOf(AppError);
  });
});
