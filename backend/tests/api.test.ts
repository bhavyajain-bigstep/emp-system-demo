import request from "supertest";
import { Types } from "mongoose";

import app from "../src/app";
import { LeaveBalance } from "../src/models/leave-balance.model";
import { LeaveRequest } from "../src/models/leave-request.model";
import { Attendance } from "../src/models/attendance.model";
import {
  TEST_PASSWORD,
  seedDepartment,
  seedEmployee,
  seedLeaveBalance,
  seedLeaveType,
  seedHoliday,
  tokenFor,
  toISO,
} from "./helpers";

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Employees API", () => {
  it("creates, lists, fetches and updates employees as HR", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const h = auth(tokenFor(hr));

    const createRes = await request(app)
      .post("/api/v1/employees")
      .set(h)
      .send({
        employeeCode: "EMP-5001",
        name: "Alice",
        email: "alice@example.com",
        password: TEST_PASSWORD,
        role: "EMPLOYEE",
        departmentId: dept._id.toString(),
        joiningDate: "2026-02-01",
        timezone: "Asia/Kolkata",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.employeeCode).toBe("EMP-5001");
    expect(createRes.body.data).not.toHaveProperty("passwordHash");

    const listRes = await request(app)
      .get("/api/v1/employees")
      .set(h)
      .query({ status: "ACTIVE" });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    const id = createRes.body.data._id;
    const getRes = await request(app)
      .get(`/api/v1/employees/${id}`)
      .set(h);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.email).toBe("alice@example.com");

    const updateRes = await request(app)
      .patch(`/api/v1/employees/${id}`)
      .set(h)
      .send({ status: "SUSPENDED" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe("SUSPENDED");
  });

  it("rejects duplicate email and duplicate employee code with 409", async () => {
    const dept = await seedDepartment("Engineering");
    await seedEmployee({
      employeeCode: "EMP-777",
      email: "dup@example.com",
      departmentId: dept._id,
    });
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const h = auth(tokenFor(hr));

    const res = await request(app)
      .post("/api/v1/employees")
      .set(h)
      .send({
        employeeCode: "EMP-777",
        name: "Duplicate",
        email: "dup@example.com",
        password: TEST_PASSWORD,
        departmentId: dept._id.toString(),
        joiningDate: "2026-02-01",
      });

    expect(res.status).toBe(409);
  });

  it("lets an EMPLOYEE view only themselves", async () => {
    const dept = await seedDepartment("Engineering");
    const a = await seedEmployee({ departmentId: dept._id });
    const b = await seedEmployee({ departmentId: dept._id });

    const self = await request(app)
      .get(`/api/v1/employees/${a._id}`)
      .set(auth(tokenFor(a)));

    expect(self.status).toBe(200);

    const other = await request(app)
      .get(`/api/v1/employees/${b._id}`)
      .set(auth(tokenFor(a)));

    expect(other.status).toBe(403);
  });

  it("lets a MANAGER view their direct reports but not outsiders", async () => {
    const dept = await seedDepartment("Engineering");
    const manager = await seedEmployee({
      role: "MANAGER",
      departmentId: dept._id,
    });
    const report = await seedEmployee({
      departmentId: dept._id,
      managerId: manager._id,
    });
    const outsider = await seedEmployee({ departmentId: dept._id });

    const ok = await request(app)
      .get(`/api/v1/employees/${report._id}`)
      .set(auth(tokenFor(manager)));

    expect(ok.status).toBe(200);
    expect(ok.body.data.email).toBe(report.email);

    const forbidden = await request(app)
      .get(`/api/v1/employees/${outsider._id}`)
      .set(auth(tokenFor(manager)));

    expect(forbidden.status).toBe(403);
  });

  it("validates employee payloads", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });

    const res = await request(app)
      .post("/api/v1/employees")
      .set(auth(tokenFor(hr)))
      .send({
        employeeCode: "X",
        name: "A",
        email: "bad",
        password: "short",
        joiningDate: "not-a-date",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("Departments API", () => {
  it("creates, lists and fetches departments", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const h = auth(tokenFor(hr));

    const createRes = await request(app)
      .post("/api/v1/departments")
      .set(h)
      .send({ name: "Operations" });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe("Operations");

    const listRes = await request(app)
      .get("/api/v1/departments")
      .set(h);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);

    const getRes = await request(app)
      .get(`/api/v1/departments/${dept._id}`)
      .set(h);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe("Engineering");
  });

  it("rejects a duplicate department name with 409", async () => {
    await seedDepartment("Engineering");
    const dept = await seedDepartment("HR");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });

    const res = await request(app)
      .post("/api/v1/departments")
      .set(auth(tokenFor(hr)))
      .send({ name: "Engineering" });

    expect(res.status).toBe(409);
  });
});

describe("Leave Types API", () => {
  it("creates, lists and deactivates leave types as HR", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const h = auth(tokenFor(hr));

    const createRes = await request(app)
      .post("/api/v1/leave-types")
      .set(h)
      .send({
        name: "Paternity Leave",
        code: "PAT",
        annualQuota: 10,
        rules: {
          allowNegativeBalance: false,
          excludeWeekends: true,
          excludeMandatoryHolidays: true,
          allowHalfDay: false,
          allowCancellation: true,
          maxConsecutiveDays: 5,
          minNoticeDays: 1,
        },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toBe("PAT");

    const listRes = await request(app)
      .get("/api/v1/leave-types")
      .set(auth(tokenFor(await seedEmployee({ role: "EMPLOYEE", departmentId: dept._id }))));

    expect(listRes.status).toBe(200);

    const id = createRes.body.data._id;
    const delRes = await request(app)
      .delete(`/api/v1/leave-types/${id}`)
      .set(h);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.status).toBe("INACTIVE");
  });
});

describe("Leave Balances API", () => {
  it("creates balances as HR and lets employees read their own", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const emp = await seedEmployee({ departmentId: dept._id });
    const lt = await seedLeaveType();
    const h = auth(tokenFor(hr));

    const createRes = await request(app)
      .post("/api/v1/leave-balances")
      .set(h)
      .send({
        employeeId: emp._id.toString(),
        leaveTypeId: lt._id.toString(),
        year: 2026,
        allocated: 12,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.available).toBe(12);

    const myRes = await request(app)
      .get("/api/v1/leave-balances/my")
      .set(auth(tokenFor(emp)));

    expect(myRes.status).toBe(200);
    expect(myRes.body.data.length).toBe(1);

    const balanceId = createRes.body.data._id;
    const forbidden = await request(app)
      .get(`/api/v1/leave-balances/${balanceId}`)
      .set(auth(tokenFor(emp)));

    expect(forbidden.status).toBe(200);

    const otherEmp = await seedEmployee({ departmentId: dept._id });
    const forbiddenOther = await request(app)
      .get(`/api/v1/leave-balances/${balanceId}`)
      .set(auth(tokenFor(otherEmp)));

    expect(forbiddenOther.status).toBe(403);

    const updateRes = await request(app)
      .patch(`/api/v1/leave-balances/${balanceId}`)
      .set(h)
      .send({ allocated: 20 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.available).toBe(20);
  });
});

describe("Leave Requests API", () => {
  it("runs the full approve workflow and deducts balance", async () => {
    const dept = await seedDepartment("Engineering");
    const manager = await seedEmployee({
      role: "MANAGER",
      departmentId: dept._id,
    });
    const emp = await seedEmployee({
      departmentId: dept._id,
      managerId: manager._id,
    });
    const lt = await seedLeaveType({ rules: { minNoticeDays: 0, maxConsecutiveDays: 5 } });
    const balance = await seedLeaveBalance(emp._id, lt._id, 2026, 12);

    const from = new Date("2026-09-01T00:00:00.000Z");
    const to = new Date("2026-09-03T00:00:00.000Z");

    const createRes = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send({
        leaveTypeId: lt._id.toString(),
        fromDate: toISO(from),
        toDate: toISO(to),
        reason: "Family function",
      });

    expect(createRes.status).toBe(201);
    const requestId = createRes.body.data._id;
    expect(createRes.body.data.days).toBe(3);

    const approveRes = await request(app)
      .put(`/api/v1/leaves/${requestId}/approve`)
      .set(auth(tokenFor(manager)));

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("APPROVED");

    const updatedBalance = await LeaveBalance.findById(balance._id);
    expect(updatedBalance!.used).toBe(3);
    expect(updatedBalance!.available).toBe(9);
  });

  it("prevents an approver from approving their own leave", async () => {
    const dept = await seedDepartment("Engineering");
    const manager = await seedEmployee({ role: "MANAGER", departmentId: dept._id });
    const lt = await seedLeaveType({ rules: { minNoticeDays: 0 } });
    await seedLeaveBalance(manager._id, lt._id, 2026, 12);

    const createRes = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(manager)))
      .send({
        leaveTypeId: lt._id.toString(),
        fromDate: toISO(new Date("2026-09-10T00:00:00.000Z")),
        toDate: toISO(new Date("2026-09-11T00:00:00.000Z")),
        reason: "Personal work",
      });

    const approveRes = await request(app)
      .put(`/api/v1/leaves/${createRes.body.data._id}/approve`)
      .set(auth(tokenFor(manager)));

    expect(approveRes.status).toBe(403);
    expect(approveRes.body.error.code).toBe("CANNOT_APPROVE_OWN_LEAVE");
  });

  it("rejects overlapping leave requests with 409", async () => {
    const dept = await seedDepartment("Engineering");
    const emp = await seedEmployee({ departmentId: dept._id });
    const lt = await seedLeaveType({ rules: { minNoticeDays: 0 } });
    await seedLeaveBalance(emp._id, lt._id, 2026, 12);

    const payload = {
      leaveTypeId: lt._id.toString(),
      fromDate: toISO(new Date("2026-10-01T00:00:00.000Z")),
      toDate: toISO(new Date("2026-10-05T00:00:00.000Z")),
      reason: "Trip",
    };

    const first = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send(payload);

    expect(first.status).toBe(201);

    const overlap = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send({
        ...payload,
        reason: "Another trip",
      });

    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe("LEAVE_OVERLAP");
  });

  it("rejects a request that exceeds available balance", async () => {
    const dept = await seedDepartment("Engineering");
    const emp = await seedEmployee({ departmentId: dept._id });
    const lt = await seedLeaveType({ rules: { minNoticeDays: 0, maxConsecutiveDays: 10 } });
    await seedLeaveBalance(emp._id, lt._id, 2026, 2);

    const res = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send({
        leaveTypeId: lt._id.toString(),
        fromDate: toISO(new Date("2026-11-01T00:00:00.000Z")),
        toDate: toISO(new Date("2026-11-05T00:00:00.000Z")),
        reason: "Vacation",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_LEAVE_BALANCE");
  });

  it("lets a manager reject a team member's request", async () => {
    const dept = await seedDepartment("Engineering");
    const manager = await seedEmployee({ role: "MANAGER", departmentId: dept._id });
    const emp = await seedEmployee({ departmentId: dept._id, managerId: manager._id });
    const lt = await seedLeaveType({ rules: { minNoticeDays: 0 } });
    await seedLeaveBalance(emp._id, lt._id, 2026, 12);

    const createRes = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send({
        leaveTypeId: lt._id.toString(),
        fromDate: toISO(new Date("2026-12-01T00:00:00.000Z")),
        toDate: toISO(new Date("2026-12-02T00:00:00.000Z")),
        reason: "Need time off",
      });

    const rejectRes = await request(app)
      .put(`/api/v1/leaves/${createRes.body.data._id}/reject`)
      .set(auth(tokenFor(manager)))
      .send({ rejectionReason: "Not approved due to workload" });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("REJECTED");

    const myRes = await request(app)
      .get("/api/v1/leaves/my")
      .set(auth(tokenFor(emp)));

    expect(myRes.status).toBe(200);
    expect(myRes.body.data.length).toBe(1);
    expect(myRes.body.data[0].status).toBe("REJECTED");
  });

  it("lets an employee cancel their own pending request and restore balance on approved cancel", async () => {
    const dept = await seedDepartment("Engineering");
    const manager = await seedEmployee({ role: "MANAGER", departmentId: dept._id });
    const emp = await seedEmployee({ departmentId: dept._id, managerId: manager._id });
    const lt = await seedLeaveType({ rules: { minNoticeDays: 0 } });
    const balance = await seedLeaveBalance(emp._id, lt._id, 2026, 12);

    const createRes = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send({
        leaveTypeId: lt._id.toString(),
        fromDate: toISO(new Date("2026-09-10T00:00:00.000Z")),
        toDate: toISO(new Date("2026-09-12T00:00:00.000Z")),
        reason: "Planned leave",
      });

    const id = createRes.body.data._id;

    const cancelRes = await request(app)
      .put(`/api/v1/leaves/${id}/cancel`)
      .set(auth(tokenFor(emp)));

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe("CANCELLED");

    // Approved → cancel → restore balance
    const create2 = await request(app)
      .post("/api/v1/leaves")
      .set(auth(tokenFor(emp)))
      .send({
        leaveTypeId: lt._id.toString(),
        fromDate: toISO(new Date("2026-09-21T00:00:00.000Z")),
        toDate: toISO(new Date("2026-09-22T00:00:00.000Z")),
        reason: "Another leave",
      });

    await request(app)
      .put(`/api/v1/leaves/${create2.body.data._id}/approve`)
      .set(auth(tokenFor(manager)));

    const balanceAfterApprove = await LeaveBalance.findById(balance._id);
    expect(balanceAfterApprove!.used).toBe(2);

    await request(app)
      .put(`/api/v1/leaves/${create2.body.data._id}/cancel`)
      .set(auth(tokenFor(emp)));

    const balanceAfterCancel = await LeaveBalance.findById(balance._id);
    expect(balanceAfterCancel!.used).toBe(0);
    expect(balanceAfterCancel!.available).toBe(12);
  });
});

describe("Attendance API", () => {
  it("checks in, rejects duplicates, checks out and builds a summary", async () => {
    const dept = await seedDepartment("Engineering");
    const emp = await seedEmployee({ departmentId: dept._id });
    const t = auth(tokenFor(emp));

    const checkIn = await request(app)
      .post("/api/v1/attendance/check-in")
      .set(t);

    expect(checkIn.status).toBe(201);
    expect(checkIn.body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const duplicate = await request(app)
      .post("/api/v1/attendance/check-in")
      .set(t);

    expect(duplicate.status).toBe(409);

    const checkOut = await request(app)
      .post("/api/v1/attendance/check-out")
      .set(t);

    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.checkOutAt).toBeDefined();

    const summary = await request(app)
      .get("/api/v1/attendance/summary")
      .set(t);

    expect(summary.status).toBe(200);
    const counted =
      summary.body.data.presentDays +
      summary.body.data.lateDays +
      summary.body.data.halfDays;
    expect(counted).toBeGreaterThanOrEqual(1);

    const list = await request(app)
      .get("/api/v1/attendance")
      .set(t);

    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
  });

  it("prevents an EMPLOYEE from checking in for another employee", async () => {
    const dept = await seedDepartment("Engineering");
    const a = await seedEmployee({ departmentId: dept._id });
    const b = await seedEmployee({ departmentId: dept._id });

    const res = await request(app)
      .post(`/api/v1/attendance/${b._id}/check-in`)
      .set(auth(tokenFor(a)));

    expect(res.status).toBe(403);
  });
});

describe("Holidays API", () => {
  it("creates, lists and deletes holidays as HR; lists as employee", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const emp = await seedEmployee({ departmentId: dept._id });
    const h = auth(tokenFor(hr));

    const createRes = await request(app)
      .post("/api/v1/holidays")
      .set(h)
      .send({
        date: toISO(new Date("2026-01-26T00:00:00.000Z")),
        name: "Republic Day",
        optional: false,
      });

    expect(createRes.status).toBe(201);

    const listAsEmp = await request(app)
      .get("/api/v1/holidays")
      .set(auth(tokenFor(emp)))
      .query({ year: 2026, month: 1 });

    expect(listAsEmp.status).toBe(200);
    expect(listAsEmp.body.data.length).toBe(1);

    const delRes = await request(app)
      .delete(`/api/v1/holidays/${createRes.body.data._id}`)
      .set(h);

    expect(delRes.status).toBe(200);
  });

  it("rejects duplicate holidays on the same date with 409", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });
    const h = auth(tokenFor(hr));
    const date = toISO(new Date("2026-08-15T00:00:00.000Z"));

    const first = await request(app)
      .post("/api/v1/holidays")
      .set(h)
      .send({ date, name: "Independence Day", optional: false });

    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/v1/holidays")
      .set(h)
      .send({ date, name: "Other Day", optional: false });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("HOLIDAY_ALREADY_EXISTS");
  });
});

describe("Reports API", () => {
  it("scopes attendance reports to the authenticated employee", async () => {
    const dept = await seedDepartment("Engineering");
    const a = await seedEmployee({ departmentId: dept._id });
    const b = await seedEmployee({ departmentId: dept._id });

    await request(app)
      .post("/api/v1/attendance/check-in")
      .set(auth(tokenFor(a)));

    const res = await request(app)
      .get("/api/v1/reports/attendance")
      .set(auth(tokenFor(a)));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].employee.employeeCode).toBe(a.employeeCode);

    const other = await request(app)
      .get("/api/v1/reports/attendance")
      .set(auth(tokenFor(b)));

    expect(other.status).toBe(200);
    expect(other.body.data.length).toBe(0);
  });
});

describe("Error handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("returns 400 for invalid ObjectId params", async () => {
    const dept = await seedDepartment("Engineering");
    const hr = await seedEmployee({ role: "HR", departmentId: dept._id });

    const res = await request(app)
      .get("/api/v1/employees/not-an-object-id")
      .set(auth(tokenFor(hr)));

    expect(res.status).toBe(400);
  });
});