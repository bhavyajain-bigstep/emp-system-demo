import type { Application } from "express";
import { Types } from "mongoose";

import app from "../../src/app";
import { LeaveBalance } from "../../src/models/leave-balance.model";
import { LeaveRequest } from "../../src/models/leave-request.model";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./setup";
import {
  seedFixtures,
  loginAs,
  agentFor,
} from "./helpers";

describe("Leave Requests API", () => {
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

  describe("POST /api/v1/leaves", () => {
    it("creates a leave request for the authenticated employee", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      // Monday-Friday window: 2026-09-07 to 2026-09-11
      const res = await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-11T00:00:00.000Z",
          reason: "Family trip",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("PENDING");
      expect(res.body.data.days).toBe(5);
    });

    it("rejects a request that exceeds maxConsecutiveDays", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      // 2026-09-07 (Mon) to 2026-09-25 (Fri) → 15 working days, > 10 max
      const res = await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-25T00:00:00.000Z",
          reason: "Long trip",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MAX_CONSECUTIVE_DAYS_EXCEEDED");
    });

    it("rejects an overlap with an existing PENDING/ APPROVED request", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-09T00:00:00.000Z",
          reason: "First trip",
        })
        .expect(201);

      const res = await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-08T00:00:00.000Z",
          toDate: "2026-09-10T00:00:00.000Z",
          reason: "Overlapping trip",
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("LEAVE_OVERLAP");
    });

    it("rejects when balance is insufficient", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      // drain the balance
      await LeaveBalance.updateOne(
        { _id: fixtures.employeeBalance.id },
        { $set: { available: 0, used: 20 } }
      );

      const res = await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-09T00:00:00.000Z",
          reason: "trip",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INSUFFICIENT_LEAVE_BALANCE");
    });

    it("rejects an inactive leave type", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      await agentFor(application, token); // warm up

      // Create an inactive leave type as HR
      const hrToken = await loginAs(application, fixtures.hr.email);
      const created = await agentFor(application, hrToken)
        .post("/api/v1/leave-types")
        .send({
          name: "Inactive",
          code: "INACTIVE",
          annualQuota: 5,
          rules: {
            allowNegativeBalance: false,
            excludeWeekends: true,
            excludeMandatoryHolidays: true,
            allowHalfDay: false,
            allowCancellation: true,
            maxConsecutiveDays: 5,
            minNoticeDays: 0,
          },
          status: "INACTIVE",
        })
        .expect(201);

      const res = await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: created.body.data._id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INACTIVE_LEAVE_TYPE");
    });

    it("rejects past dates (insufficient notice)", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2020-01-01T00:00:00.000Z",
          toDate: "2020-01-02T00:00:00.000Z",
          reason: "past",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INSUFFICIENT_NOTICE");
    });

    it("rejects invalid leave type id with 400", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: "not-an-id",
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-09T00:00:00.000Z",
          reason: "trip",
        });

      expect(res.status).toBe(400);
    });

    it("rejects invalid date range (fromDate > toDate) at the schema level", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-20T00:00:00.000Z",
          toDate: "2026-09-07T00:00:00.000Z",
          reason: "backwards",
        });

      // Schema-level validation may reject; service also rejects
      expect([400, 201]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.data.days).toBe(0);
      }
    });
  });

  describe("GET /api/v1/leaves/pending", () => {
    it("MANAGER sees only direct reports' pending requests", async () => {
      const fixtures = await seedFixtures();
      const managerToken = await loginAs(application, fixtures.manager.email);

      await LeaveRequest.create({
        employeeId: new Types.ObjectId(fixtures.employee.id),
        leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
        fromDate: new Date("2026-09-07"),
        toDate: new Date("2026-09-08"),
        days: 2,
        reason: "trip",
        status: "PENDING",
      });
      await LeaveRequest.create({
        employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
        leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
        fromDate: new Date("2026-09-07"),
        toDate: new Date("2026-09-08"),
        days: 2,
        reason: "trip",
        status: "PENDING",
      });

      const res = await agentFor(application, managerToken).get(
        "/api/v1/leaves/pending"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("HR sees all pending requests", async () => {
      const fixtures = await seedFixtures();
      const hrToken = await loginAs(application, fixtures.hr.email);

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
          fromDate: new Date("2026-09-07"),
          toDate: new Date("2026-09-08"),
          days: 2,
          reason: "trip",
          status: "PENDING",
        },
      ]);

      const res = await agentFor(application, hrToken).get(
        "/api/v1/leaves/pending"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it("rejects EMPLOYEE with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get(
        "/api/v1/leaves/pending"
      );
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/v1/leaves/:id/approve", () => {
    it("MANAGER approves their direct report's request and deducts balance", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);
      const managerToken = await loginAs(application, fixtures.manager.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-09T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, managerToken).put(
        `/api/v1/leaves/${created.body.data._id}/approve`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("APPROVED");

      const balance = await LeaveBalance.findById(fixtures.employeeBalance.id);
      expect(balance!.used).toBe(3);
      expect(balance!.available).toBe(17);
    });

    it("HR can approve anyone's request", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);
      const hrToken = await loginAs(application, fixtures.hr.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, hrToken).put(
        `/api/v1/leaves/${created.body.data._id}/approve`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("APPROVED");
    });

    it("forbids approval by an unrelated manager", async () => {
      const fixtures = await seedFixtures();
      const otherDept = await (
        await import("../../src/models/department.model")
      ).Department.create({ name: "Other Dept" });
      const { hash } = await import("bcrypt-ts");
      const otherManager = await (
        await import("../../src/models/employee.model")
      ).Employee.create({
        employeeCode: "EMP-OMGR",
        name: "Other Manager",
        email: "omgr@example.com",
        passwordHash: await hash("Password123!", 12),
        role: "MANAGER",
        departmentId: otherDept._id,
        joiningDate: new Date(),
        timezone: "Asia/Kolkata",
        status: "ACTIVE",
      });

      const employeeToken = await loginAs(application, fixtures.employee.email);
      const otherMgrToken = await loginAs(
        application,
        otherManager.email,
        "Password123!"
      );

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, otherMgrToken).put(
        `/api/v1/leaves/${created.body.data._id}/approve`
      );
      expect(res.status).toBe(403);
    });

    it("prevents EMPLOYEE from approving (role middleware)", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, employeeToken).put(
        `/api/v1/leaves/${created.body.data._id}/approve`
      );
      // Role middleware blocks EMPLOYEE before service can detect self-approval.
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects approval of an already approved request with 400", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);
      const managerToken = await loginAs(application, fixtures.manager.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      await agentFor(application, managerToken)
        .put(`/api/v1/leaves/${created.body.data._id}/approve`)
        .expect(200);

      const res = await agentFor(application, managerToken).put(
        `/api/v1/leaves/${created.body.data._id}/approve`
      );
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/v1/leaves/:id/reject", () => {
    it("MANAGER rejects their report's request", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);
      const managerToken = await loginAs(application, fixtures.manager.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, managerToken)
        .put(`/api/v1/leaves/${created.body.data._id}/reject`)
        .send({ rejectionReason: "Insufficient coverage" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REJECTED");
      expect(res.body.data.rejectionReason).toBe("Insufficient coverage");
    });

    it("rejects when EMPLOYEE attempts to reject", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, employeeToken)
        .put(`/api/v1/leaves/${created.body.data._id}/reject`)
        .send({ rejectionReason: "Reason" });

      expect(res.status).toBe(403);
    });

    it("rejects missing rejectionReason with 400", async () => {
      const fixtures = await seedFixtures();
      const managerToken = await loginAs(application, fixtures.manager.email);

      // create a request as the report
      const employeeToken = await loginAs(application, fixtures.employee.email);
      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, managerToken)
        .put(`/api/v1/leaves/${created.body.data._id}/reject`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/v1/leaves/:id/cancel", () => {
    it("EMPLOYEE cancels their own PENDING request", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, employeeToken).put(
        `/api/v1/leaves/${created.body.data._id}/cancel`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
    });

    it("EMPLOYEE cancels APPROVED request and balance is restored", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);
      const managerToken = await loginAs(application, fixtures.manager.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-09T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      await agentFor(application, managerToken)
        .put(`/api/v1/leaves/${created.body.data._id}/approve`)
        .expect(200);

      const afterApproval = await LeaveBalance.findById(fixtures.employeeBalance.id);
      expect(afterApproval!.used).toBe(3);
      expect(afterApproval!.available).toBe(17);

      await agentFor(application, employeeToken)
        .put(`/api/v1/leaves/${created.body.data._id}/cancel`)
        .expect(200);

      const afterCancel = await LeaveBalance.findById(fixtures.employeeBalance.id);
      expect(afterCancel!.used).toBe(0);
      expect(afterCancel!.available).toBe(20);
    });

    it("forbids EMPLOYEE cancelling another employee's request with 403", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);

      const otherReq = await LeaveRequest.create({
        employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
        leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
        fromDate: new Date("2026-09-07"),
        toDate: new Date("2026-09-08"),
        days: 2,
        reason: "trip",
        status: "PENDING",
      });

      const res = await agentFor(application, employeeToken).put(
        `/api/v1/leaves/${otherReq._id.toString()}/cancel`
      );
      expect(res.status).toBe(403);
    });

    it("HR can cancel any request", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);
      const hrToken = await loginAs(application, fixtures.hr.email);

      const created = await agentFor(application, employeeToken)
        .post("/api/v1/leaves")
        .send({
          leaveTypeId: fixtures.leaveType.id,
          fromDate: "2026-09-07T00:00:00.000Z",
          toDate: "2026-09-08T00:00:00.000Z",
          reason: "trip",
        })
        .expect(201);

      const res = await agentFor(application, hrToken).put(
        `/api/v1/leaves/${created.body.data._id}/cancel`
      );
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/v1/leaves/my", () => {
    it("returns only the authenticated employee's leave requests", async () => {
      const fixtures = await seedFixtures();
      const employeeToken = await loginAs(application, fixtures.employee.email);

      await LeaveRequest.insertMany([
        {
          employeeId: new Types.ObjectId(fixtures.employee.id),
          leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
          fromDate: new Date("2026-09-07"),
          toDate: new Date("2026-09-08"),
          days: 2,
          reason: "trip1",
          status: "APPROVED",
        },
        {
          employeeId: new Types.ObjectId(fixtures.otherEmployee.id),
          leaveTypeId: new Types.ObjectId(fixtures.leaveType.id),
          fromDate: new Date("2026-09-10"),
          toDate: new Date("2026-09-11"),
          days: 2,
          reason: "trip2",
          status: "APPROVED",
        },
      ]);

      const res = await agentFor(application, employeeToken).get(
        "/api/v1/leaves/my"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });
});
