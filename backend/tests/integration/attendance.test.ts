import type { Application } from "express";
import { Types } from "mongoose";

import app from "../../src/app";
import { Attendance } from "../../src/models/attendance.model";
import { Holiday } from "../../src/models/holiday.model";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./setup";
import {
  seedFixtures,
  loginAs,
  agentFor,
} from "./helpers";

describe("Attendance API", () => {
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

  describe("POST /api/v1/attendance/check-in", () => {
    it("checks in the authenticated employee", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).post(
        "/api/v1/attendance/check-in"
      );

      expect(res.status).toBe(201);
      expect(res.body.data.employeeId).toBe(fixtures.employee.id);
      expect(res.body.data.checkInAt).toEqual(expect.any(String));
    });

    it("rejects a second check-in for the same day with 409", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await agentFor(application, token)
        .post("/api/v1/attendance/check-in")
        .expect(201);

      const res = await agentFor(application, token).post(
        "/api/v1/attendance/check-in"
      );
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ALREADY_CHECKED_IN");
    });

    it("rejects check-in for another employee when called by EMPLOYEE", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).post(
        `/api/v1/attendance/${fixtures.otherEmployee.id}/check-in`
      );
      expect(res.status).toBe(403);
    });

    it("allows HR to check in on behalf of any employee", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).post(
        `/api/v1/attendance/${fixtures.employee.id}/check-in`
      );
      expect(res.status).toBe(201);
    });

    it("returns 400 for a malformed employee id", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).post(
        `/api/v1/attendance/not-an-id/check-in`
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for a valid but missing employee id", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).post(
        `/api/v1/attendance/507f1f77bcf86cd799439099/check-in`
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/attendance/check-out", () => {
    it("checks out the authenticated employee after check-in", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await agentFor(application, token)
        .post("/api/v1/attendance/check-in")
        .expect(201);

      const res = await agentFor(application, token).post(
        "/api/v1/attendance/check-out"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.checkOutAt).toEqual(expect.any(String));
    });

    it("returns 404 when there is no check-in", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).post(
        "/api/v1/attendance/check-out"
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NO_CHECKIN_FOUND");
    });

    it("returns 409 on double check-out", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await agentFor(application, token)
        .post("/api/v1/attendance/check-in")
        .expect(201);

      await agentFor(application, token)
        .post("/api/v1/attendance/check-out")
        .expect(200);

      const res = await agentFor(application, token).post(
        "/api/v1/attendance/check-out"
      );
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ALREADY_CHECKED_OUT");
    });
  });

  describe("GET /api/v1/attendance", () => {
    it("returns only the authenticated EMPLOYEE's records", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);

      // seed records for both employees
      const today = new Date().toISOString().slice(0, 10);
      await Attendance.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        date: today,
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });
      await Attendance.create({
        employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
        date: today,
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const res = await agentFor(application, employeeToken).get(
        "/api/v1/attendance"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("MANAGER sees their direct reports' records", async () => {
      const fixtures = await seedFixtures();
      const managerToken = await loginAs(application, fixtures.manager.email);

      const today = new Date().toISOString().slice(0, 10);
      await Attendance.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        date: today,
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });
      await Attendance.create({
        employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
        date: today,
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const res = await agentFor(application, managerToken).get(
        "/api/v1/attendance"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("MANAGER cannot query an unrelated employee directly", async () => {
      const fixtures = await seedFixtures();
      const managerToken = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, managerToken)
        .get("/api/v1/attendance")
        .query({ employeeId: fixtures.otherEmployee.id });

      expect(res.status).toBe(403);
    });

    it("HR can query any employee's records", async () => {
      const fixtures = await seedFixtures();
      const hrToken = await loginAs(application, fixtures.hr.email);

      const today = new Date().toISOString().slice(0, 10);
      await Attendance.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        date: today,
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const res = await agentFor(application, hrToken)
        .get("/api/v1/attendance")
        .query({ employeeId: fixtures.employee.id });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("supports date range filters", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await Attendance.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        date: "2026-08-10",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });
      await Attendance.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        date: "2026-08-20",
        checkInAt: new Date(),
        status: "PRESENT",
        timezone: "Asia/Kolkata",
      });

      const res = await agentFor(application, token)
        .get("/api/v1/attendance")
        .query({ from: "2026-08-15", to: "2026-08-31" });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].date).toBe("2026-08-20");
    });
  });

  describe("GET /api/v1/attendance/summary", () => {
    it("returns a monthly summary for the authenticated employee", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .get("/api/v1/attendance/summary")
        .query({ year: 2026, month: 8 });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        year: 2026,
        month: 8,
        employeeId: fixtures.employee.id,
      });
      expect(res.body.data.totalWorkingDays).toBeGreaterThan(0);
    });

    it("excludes weekends and holidays from working days", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await Holiday.create({
        date: new Date("2026-08-26T00:00:00Z"),
        name: "Test Holiday",
        optional: false,
        createdBy: new Types.ObjectId(fixtures.hr.id),
      });

      const res = await agentFor(application, token)
        .get("/api/v1/attendance/summary")
        .query({ year: 2026, month: 8 });

      expect(res.status).toBe(200);
      expect(res.body.data.holidays).toBe(1);
      expect(res.body.data.weekends).toBeGreaterThan(0);
    });

    it("counts PRESENT/LATE/HALF_DAY/LEAVE and computes absentDays", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await Attendance.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-03",
          checkInAt: new Date(),
          status: "PRESENT",
          timezone: "Asia/Kolkata",
        },
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-04",
          checkInAt: new Date(),
          status: "LATE",
          timezone: "Asia/Kolkata",
        },
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-05",
          checkInAt: new Date(),
          status: "HALF_DAY",
          timezone: "Asia/Kolkata",
        },
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          date: "2026-08-06",
          checkInAt: new Date(),
          status: "LEAVE",
          timezone: "Asia/Kolkata",
        },
      ]);

      const res = await agentFor(application, token)
        .get("/api/v1/attendance/summary")
        .query({ year: 2026, month: 8 });

      expect(res.status).toBe(200);
      expect(res.body.data.presentDays).toBe(1);
      expect(res.body.data.lateDays).toBe(1);
      expect(res.body.data.halfDays).toBe(1);
      expect(res.body.data.leaveDays).toBe(1);
      expect(res.body.data.absentDays).toBeGreaterThanOrEqual(0);
    });

    it("rejects EMPLOYEE trying to view another employee's summary with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .get(`/api/v1/attendance/${fixtures.otherEmployee.id}/summary`)
        .query({ year: 2026, month: 8 });

      expect(res.status).toBe(403);
    });

    it("HR can view any employee's monthly summary", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .get(`/api/v1/attendance/${fixtures.employee.id}/summary`)
        .query({ year: 2026, month: 8 });

      expect(res.status).toBe(200);
    });
  });
});
