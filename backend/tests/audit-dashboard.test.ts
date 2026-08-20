import request from "supertest";

import app from "../src/app";
import { AuditLog } from "../src/models/audit-log.model";
import { LeaveRequest } from "../src/models/leave-request.model";
import { LeaveBalance } from "../src/models/leave-balance.model";
import {
  TEST_PASSWORD,
  seedDepartment,
  seedEmployee,
  seedLeaveBalance,
  seedLeaveType,
  tokenFor,
  toISO,
} from "./helpers";

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Audit log API", () => {
  it("lets HR list audit logs, but not EMPLOYEE", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const emp = await seedEmployee({ departmentId: dept._id });

    const createRes = await request(app)
      .post("/api/v1/employees")
      .set(auth(tokenFor(hr)))
      .send({
        employeeCode: "EMP-AUDIT-1",
        name: "Audit Target",
        email: `audit-${Date.now()}@example.com`,
        password: TEST_PASSWORD,
        role: "EMPLOYEE",
        departmentId: dept._id.toString(),
        joiningDate: "2026-02-01",
        timezone: "Asia/Kolkata",
      });

    expect(createRes.status).toBe(201);

    const hrList = await request(app)
      .get("/api/v1/audit-logs")
      .set(auth(tokenFor(hr)));

    expect(hrList.status).toBe(200);
    expect(hrList.body.data.length).toBeGreaterThanOrEqual(1);

    const empList = await request(app)
      .get("/api/v1/audit-logs")
      .set(auth(tokenFor(emp)));

    expect(empList.status).toBe(403);
  });

  it("records a LEAVE_APPROVED audit entry in the same transaction", async () => {
    const dept = await seedDepartment("Engineering");
    const manager = await seedEmployee({ role: "MANAGER", departmentId: dept._id });
    const emp = await seedEmployee({ departmentId: dept._id, managerId: manager._id });
    const lt = await seedLeaveType({
      rules: { minNoticeDays: 0, excludeWeekends: false },
    });
    await seedLeaveBalance(emp._id, lt._id, 2026, 12);

    const createRes = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send({
        leaveTypeId: lt._id.toString(),
        fromDate: toISO(new Date("2026-11-01T00:00:00.000Z")),
        toDate: toISO(new Date("2026-11-02T00:00:00.000Z")),
        reason: "Audit trail test",
      });

    const id = createRes.body.data._id;

    await request(app)
      .put(`/api/v1/leaves/${id}/approve`)
      .set(auth(tokenFor(manager)));

    const log = await AuditLog.findOne({ action: "LEAVE_APPROVED", entityId: id });
    expect(log).toBeTruthy();
    expect(log!.actorId!.toString()).toBe(manager._id.toString());
  });
});

describe("Dashboard report API", () => {
  it("returns a dashboard summary for HR", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });

    const res = await request(app)
      .get("/api/v1/reports/dashboard")
      .set(auth(tokenFor(hr)));

    expect(res.status).toBe(200);
    expect(res.body.data.employees).toHaveProperty("total");
    expect(res.body.data.employees.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.leaves).toHaveProperty("pending");
    expect(res.body.data.attendance).toHaveProperty("total");
  });

  it("scopes the dashboard to an EMPLOYEE's own data", async () => {
    const dept = await seedDepartment("Engineering");
    const emp = await seedEmployee({ departmentId: dept._id });

    const res = await request(app)
      .get("/api/v1/reports/dashboard")
      .set(auth(tokenFor(emp)));

    expect(res.status).toBe(200);
    expect(res.body.data.employees.total).toBe(1);
  });
});

describe("Employee cross-validation", () => {
  it("rejects employee creation without a departmentId", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });

    const res = await request(app)
      .post("/api/v1/employees")
      .set(auth(tokenFor(hr)))
      .send({
        employeeCode: "EMP-NODEPT",
        name: "No Dept",
        email: `nodept-${Date.now()}@example.com`,
        password: TEST_PASSWORD,
        role: "EMPLOYEE",
        joiningDate: "2026-02-01",
      });

    expect(res.status).toBe(400);
  });

  it("rejects employee creation with a non-existent department", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });

    const res = await request(app)
      .post("/api/v1/employees")
      .set(auth(tokenFor(hr)))
      .send({
        employeeCode: "EMP-BADDEPT",
        name: "Bad Dept",
        email: `baddept-${Date.now()}@example.com`,
        password: TEST_PASSWORD,
        role: "EMPLOYEE",
        departmentId: "64b000000000000000000000",
        joiningDate: "2026-02-01",
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DEPARTMENT_NOT_FOUND");
  });

  it("rejects assigning a non-manager as manager", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const peer = await seedEmployee({ departmentId: dept._id });

    const res = await request(app)
      .post("/api/v1/employees")
      .set(auth(tokenFor(hr)))
      .send({
        employeeCode: "EMP-BADMGR",
        name: "Bad Mgr",
        email: `badmgr-${Date.now()}@example.com`,
        password: TEST_PASSWORD,
        role: "EMPLOYEE",
        departmentId: dept._id.toString(),
        managerId: peer._id.toString(),
        joiningDate: "2026-02-01",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_MANAGER_ROLE");
  });

  it("rejects an employee being their own manager on update", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const emp = await seedEmployee({ departmentId: dept._id });

    const res = await request(app)
      .patch(`/api/v1/employees/${emp._id.toString()}`)
      .set(auth(tokenFor(hr)))
      .send({ managerId: emp._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SELF_MANAGER");
  });
});

describe("Approval atomicity", () => {
  it("rolls back the balance deduction when approval fails partway", async () => {
    const dept = await seedDepartment("Engineering");
    const manager = await seedEmployee({ role: "MANAGER", departmentId: dept._id });
    const emp = await seedEmployee({ departmentId: dept._id, managerId: manager._id });
    const lt = await seedLeaveType({
      rules: { minNoticeDays: 0, maxConsecutiveDays: 10, allowNegativeBalance: false, excludeWeekends: false },
    });
    const balance = await seedLeaveBalance(emp._id, lt._id, 2026, 12);

    const createRes = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send({
        leaveTypeId: lt._id.toString(),
        fromDate: toISO(new Date("2026-11-01T00:00:00.000Z")),
        toDate: toISO(new Date("2026-11-03T00:00:00.000Z")),
        reason: "Atomicity test",
      });

    expect(createRes.status).toBe(201);
    const id = createRes.body.data._id;

    // Simulate another approval consuming the balance before this one commits.
    await LeaveBalance.findByIdAndUpdate(balance._id, { used: 10, available: 2 });

    const failRes = await request(app)
      .put(`/api/v1/leaves/${id}/approve`)
      .set(auth(tokenFor(manager)));

    expect(failRes.status).toBe(400);
    expect(failRes.body.error.code).toBe("INSUFFICIENT_LEAVE_BALANCE");

    const requestDoc = await LeaveRequest.findById(id);
    expect(requestDoc!.status).toBe("PENDING");

    const balanceDoc = await LeaveBalance.findById(balance._id);
    expect(balanceDoc!.used).toBe(10);
    expect(balanceDoc!.available).toBe(2);
  });
});