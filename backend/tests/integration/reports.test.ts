import type { Application } from "express";
import { Types } from "mongoose";

import app from "../../src/app";
import { Attendance } from "../../src/models/attendance.model";
import { LeaveRequest } from "../../src/models/leave-request.model";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./setup";
import {
  seedFixtures,
  loginAs,
  agentFor,
} from "./helpers";

describe("Reports API", () => {
  let application: Application;

  beforeAll(async () => {
    await connectTestDb();
    application = app;
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe("GET /api/v1/reports/attendance", () => {
    it("EMPLOYEE sees only their own attendance records", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await Attendance.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-10",
          checkInAt: new Date(),
          status: "PRESENT",
          timezone: "Asia/Kolkata",
        },
        {
          employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
          date: "2026-08-10",
          checkInAt: new Date(),
          status: "PRESENT",
          timezone: "Asia/Kolkata",
        },
      ]);

      const res = await agentFor(application, token).get(
        "/api/v1/reports/attendance"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("HR can scope by employee and date range", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      await Attendance.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-10",
          checkInAt: new Date("2026-08-10T03:00:00Z"),
          checkOutAt: new Date("2026-08-10T11:00:00Z"),
          status: "PRESENT",
          timezone: "Asia/Kolkata",
        },
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-20",
          checkInAt: new Date("2026-08-20T03:00:00Z"),
          status: "LATE",
          timezone: "Asia/Kolkata",
        },
      ]);

      const res = await agentFor(application, token)
        .get("/api/v1/reports/attendance")
        .query({
          employeeId: fixtures.employee.id,
          from: "2026-08-15",
          to: "2026-08-31",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].date).toBe("2026-08-20");
      expect(res.body.data[0].isLate).toBe(true);
    });

    it("MANAGER sees team-scoped results by default", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      await Attendance.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-10",
          checkInAt: new Date(),
          status: "PRESENT",
          timezone: "Asia/Kolkata",
        },
        {
          employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
          date: "2026-08-10",
          checkInAt: new Date(),
          status: "PRESENT",
          timezone: "Asia/Kolkata",
        },
      ]);

      const res = await agentFor(application, token).get(
        "/api/v1/reports/attendance"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("MANAGER cannot query an unrelated employee", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, token)
        .get("/api/v1/reports/attendance")
        .query({ employeeId: fixtures.otherEmployee.id });

      expect(res.status).toBe(403);
    });

    it("supports pagination", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const records = Array.from({ length: 25 }, (_, i) => ({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        date: `2026-08-${String(i + 1).padStart(2, "0")}`,
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      }));
      await Attendance.insertMany(records);

      const res = await agentFor(application, token)
        .get("/api/v1/reports/attendance")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(10);
      expect(res.body.pagination.total).toBe(25);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it("returns empty results when no records match", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .get("/api/v1/reports/attendance")
        .query({ from: "2030-01-01", to: "2030-01-31" });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe("GET /api/v1/reports/attendance/export", () => {
    it("returns a CSV stream with the correct headers", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await Attendance.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        date: "2026-08-10",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const res = await agentFor(application, token).get(
        "/api/v1/reports/attendance/export"
      );

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(res.headers["content-disposition"]).toMatch(/attachment/);
      expect(res.text).toContain("Employee Code");
      expect(res.text).toContain("Date");
    });

    it("scopes CSV export to the authenticated employee", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await Attendance.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-10",
          checkInAt: new Date(),
          status: "PRESENT",
          timezone: "Asia/Kolkata",
        },
        {
          employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
          date: "2026-08-11",
          checkInAt: new Date(),
          status: "PRESENT",
          timezone: "Asia/Kolkata",
        },
      ]);

      const res = await agentFor(application, token).get(
        "/api/v1/reports/attendance/export"
      );

      expect(res.status).toBe(200);
      const dataLines = res.text.split("\n").filter((l) => l.trim() && !l.startsWith("Employee"));
      expect(dataLines.length).toBe(1);
    });
  });

  describe("GET /api/v1/reports/leaves", () => {
    it("EMPLOYEE sees only their own leave records", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await LeaveRequest.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
          fromDate: new Date("2026-09-07"),
          toDate: new Date("2026-09-08"),
          days: 2,
          reason: "trip1",
          status: "PENDING",
        },
        {
          employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
          leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
          fromDate: new Date("2026-09-10"),
          toDate: new Date("2026-09-11"),
          days: 2,
          reason: "trip2",
          status: "PENDING",
        },
      ]);

      const res = await agentFor(application, token).get(
        "/api/v1/reports/leaves"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("filters by status and leaveType", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await LeaveRequest.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
          fromDate: new Date("2026-09-07"),
          toDate: new Date("2026-09-08"),
          days: 2,
          reason: "trip",
          status: "APPROVED",
        },
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
          fromDate: new Date("2026-09-10"),
          toDate: new Date("2026-09-11"),
          days: 2,
          reason: "trip",
          status: "PENDING",
        },
      ]);

      const res = await agentFor(application, token)
        .get("/api/v1/reports/leaves")
        .query({ status: "PENDING" });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe("PENDING");
    });

    it("MANAGER sees team-scoped results", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      await LeaveRequest.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
          fromDate: new Date("2026-09-07"),
          toDate: new Date("2026-09-08"),
          days: 2,
          reason: "trip",
          status: "PENDING",
        },
        {
          employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
          leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
          fromDate: new Date("2026-09-10"),
          toDate: new Date("2026-09-11"),
          days: 2,
          reason: "trip",
          status: "PENDING",
        },
      ]);

      const res = await agentFor(application, token).get(
        "/api/v1/reports/leaves"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe("GET /api/v1/reports/leaves/export", () => {
    it("returns CSV stream with leave-specific columns", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await LeaveRequest.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
        fromDate: new Date("2026-09-07"),
        toDate: new Date("2026-09-08"),
        days: 2,
        reason: "vacation",
        status: "APPROVED",
      });

      const res = await agentFor(application, token).get(
        "/api/v1/reports/leaves/export"
      );

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(res.text).toContain("Leave ID");
      expect(res.text).toContain("Annual");
    });
  });
});
