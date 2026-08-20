import type { Application } from "express";
import { Types } from "mongoose";

import app from "../../src/app";
import { LeaveBalance } from "../../src/models/leave-balance.model";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./setup";
import {
  seedFixtures,
  loginAs,
  agentFor,
  createEmployee,
} from "./helpers";

describe("Leave Balances API", () => {
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

  describe("POST /api/v1/leave-balances", () => {
    it("HR allocates a leave balance", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      // create a new employee and a separate leave type for this allocation
      const newEmployee = await createEmployee({
        departmentId: fixtures.department.id,
        managerId: fixtures.manager.id,
        role: "EMPLOYEE",
      });

      const res = await agentFor(application, token)
        .post("/api/v1/leave-balances")
        .send({
          employeeId: newEmployee.id,
          leaveTypeId: fixtures.leaveType.id,
          year: 2026,
          allocated: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.allocated).toBe(15);
      expect(res.body.data.available).toBe(15);
      expect(res.body.data.used).toBe(0);
    });

    it("rejects duplicate (employee, leaveType, year) with 409", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .post("/api/v1/leave-balances")
        .send({
          employeeId: fixtures.employee.id,
          leaveTypeId: fixtures.leaveType.id,
          year: new Date().getFullYear(),
          allocated: 10,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("LEAVE_BALANCE_ALREADY_EXISTS");
    });

    it("rejects EMPLOYEE creating balances with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .post("/api/v1/leave-balances")
        .send({
          employeeId: fixtures.employee.id,
          leaveTypeId: fixtures.leaveType.id,
          year: 2030,
          allocated: 5,
        });

      expect(res.status).toBe(403);
    });

    it("rejects invalid employee id with 400", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .post("/api/v1/leave-balances")
        .send({
          employeeId: "not-an-id",
          leaveTypeId: fixtures.leaveType.id,
          year: 2030,
          allocated: 5,
        });

      expect(res.status).toBe(400);
    });

    it("rejects creating balance for inactive leave type", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      // Deactivate the leave type
      await (
        await import("../../src/models/leave-type.model")
      ).LeaveType.updateOne(
        { _id: fixtures.leaveType.id },
        { $set: { status: "INACTIVE" } }
      );

      const newEmployee = await createEmployee({
        departmentId: fixtures.department.id,
        managerId: fixtures.manager.id,
      });

      const res = await agentFor(application, token)
        .post("/api/v1/leave-balances")
        .send({
          employeeId: newEmployee.id,
          leaveTypeId: fixtures.leaveType.id,
          year: 2030,
          allocated: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INACTIVE_LEAVE_TYPE");
    });
  });

  describe("GET /api/v1/leave-balances/my", () => {
    it("returns the authenticated employee's balances", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get(
        "/api/v1/leave-balances/my"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].allocated).toBe(20);
    });

    it("filters by year when provided", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      // Create a balance for next year
      await LeaveBalance.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
        year: 2030,
        allocated: 25,
        used: 0,
        available: 25,
      });

      const res = await agentFor(application, token)
        .get("/api/v1/leave-balances/my")
        .query({ year: 2030 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].allocated).toBe(25);
    });
  });

  describe("GET /api/v1/leave-balances/employee/:employeeId", () => {
    it("MANAGER can view their direct report's balances", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, token).get(
        `/api/v1/leave-balances/employee/${fixtures.employee.id}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("EMPLOYEE can view their own balances via this endpoint", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get(
        `/api/v1/leave-balances/employee/${fixtures.employee.id}`
      );

      expect(res.status).toBe(200);
    });

    it("EMPLOYEE cannot view another employee's balances", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get(
        `/api/v1/leave-balances/employee/${fixtures.otherEmployee.id}`
      );

      expect(res.status).toBe(403);
    });

    it("MANAGER cannot view non-report balances", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, token).get(
        `/api/v1/leave-balances/employee/${fixtures.otherEmployee.id}`
      );

      expect(res.status).toBe(403);
    });

    it("HR can view any employee's balances", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get(
        `/api/v1/leave-balances/employee/${fixtures.otherEmployee.id}`
      );

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/v1/leave-balances", () => {
    it("HR can list all balances", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get(
        "/api/v1/leave-balances"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("rejects non-HR with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get(
        "/api/v1/leave-balances"
      );

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/v1/leave-balances/:id", () => {
    it("HR updates allocation", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .patch(`/api/v1/leave-balances/${fixtures.employeeBalance.id}`)
        .send({ allocated: 25 });

      expect(res.status).toBe(200);
      expect(res.body.data.allocated).toBe(25);
      expect(res.body.data.available).toBe(25);
    });

    it("rejects allocation below used amount with 400", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      // simulate 10 used
      await LeaveBalance.updateOne(
        { _id: fixtures.employeeBalance.id },
        { $set: { used: 10, available: 10 } }
      );

      const res = await agentFor(application, token)
        .patch(`/api/v1/leave-balances/${fixtures.employeeBalance.id}`)
        .send({ allocated: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ALLOCATION");
    });

    it("rejects non-HR with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .patch(`/api/v1/leave-balances/${fixtures.employeeBalance.id}`)
        .send({ allocated: 30 });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/leave-balances/:id", () => {
    it("returns the balance for HR", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get(
        `/api/v1/leave-balances/${fixtures.employeeBalance.id}`
      );

      expect(res.status).toBe(200);
    });

    it("rejects 400 for malformed ObjectId", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get(
        "/api/v1/leave-balances/not-an-id"
      );

      expect(res.status).toBe(400);
    });
  });
});
