import request from "supertest";
import type { Application } from "express";

import app from "../../src/app";
import { Employee } from "../../src/models/employee.model";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./setup";
import {
  seedFixtures,
  loginAs,
  agentFor,
  DEFAULT_TEST_PASSWORD,
} from "./helpers";

describe("Employees API", () => {
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

  describe("GET /api/v1/employees", () => {
    it("returns the employee list for HR", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get("/api/v1/employees");

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
      res.body.data.forEach((emp: any) => {
        expect(emp.passwordHash).toBeUndefined();
      });
    });

    it("returns the employee list for ADMIN", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.admin.email);

      const res = await agentFor(application, token).get("/api/v1/employees");
      expect(res.status).toBe(200);
    });

    it("rejects EMPLOYEE with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get("/api/v1/employees");
      expect(res.status).toBe(403);
    });

    it("rejects MANAGER with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, token).get("/api/v1/employees");
      expect(res.status).toBe(403);
    });

    it("supports pagination and filtering by department", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .get("/api/v1/employees")
        .query({ page: "1", limit: "2", departmentId: fixtures.department.id });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.limit).toBe(2);
    });

    it("clamps limit to max 100", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .get("/api/v1/employees")
        .query({ limit: "9999" });

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(100);
    });

    it("rejects invalid departmentId with 400", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .get("/api/v1/employees")
        .query({ departmentId: "not-an-objectid" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/employees/:id", () => {
    it("returns the employee when EMPLOYEE views themselves", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get(
        `/api/v1/employees/${fixtures.employee.id}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(fixtures.employee.email);
    });

    it("returns the employee when MANAGER views a direct report", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, token).get(
        `/api/v1/employees/${fixtures.employee.id}`
      );

      expect(res.status).toBe(200);
    });

    it("returns the employee when HR views any", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get(
        `/api/v1/employees/${fixtures.otherEmployee.id}`
      );

      expect(res.status).toBe(200);
    });

    it("returns 403 when EMPLOYEE tries to view another employee", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get(
        `/api/v1/employees/${fixtures.otherEmployee.id}`
      );

      expect(res.status).toBe(403);
    });

    it("returns 403 when MANAGER tries to view non-report", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, token).get(
        `/api/v1/employees/${fixtures.otherEmployee.id}`
      );

      expect(res.status).toBe(403);
    });

    it("returns 400 for malformed ObjectId", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get(
        `/api/v1/employees/not-an-id`
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 for a valid but missing ObjectId", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get(
        `/api/v1/employees/507f1f77bcf86cd799439099`
      );

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/employees", () => {
    it("creates an employee as HR", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .post("/api/v1/employees")
        .send({
          employeeCode: "EMP-NEW",
          name: "New User",
          email: "new@example.com",
          password: "Password123!",
          role: "EMPLOYEE",
          departmentId: fixtures.department.id,
          joiningDate: "2026-08-20",
          timezone: "Asia/Kolkata",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.employeeCode).toBe("EMP-NEW");
      expect(res.body.data.passwordHash).toBeUndefined();

      const stored = await Employee.findOne({ email: "new@example.com" }).select("+passwordHash");
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).toMatch(/^\$2/);
    });

    it("rejects duplicate email with 409", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .post("/api/v1/employees")
        .send({
          employeeCode: "EMP-DUP",
          name: "Dup User",
          email: fixtures.employee.email,
          password: "Password123!",
          role: "EMPLOYEE",
          departmentId: fixtures.department.id,
          joiningDate: "2026-08-20",
          timezone: "Asia/Kolkata",
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("rejects duplicate employee code with 409", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .post("/api/v1/employees")
        .send({
          employeeCode: fixtures.employee.employeeCode,
          name: "Dup Code User",
          email: "another@example.com",
          password: "Password123!",
          role: "EMPLOYEE",
          departmentId: fixtures.department.id,
          joiningDate: "2026-08-20",
          timezone: "Asia/Kolkata",
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMPLOYEE_CODE_ALREADY_EXISTS");
    });

    it("rejects EMPLOYEE creating other employees with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token)
        .post("/api/v1/employees")
        .send({
          employeeCode: "EMP-FAIL",
          name: "Should Fail",
          email: "fail@example.com",
          password: "Password123!",
          role: "EMPLOYEE",
          departmentId: fixtures.department.id,
          joiningDate: "2026-08-20",
        });

      expect(res.status).toBe(403);
    });

    it("rejects invalid payload with 400", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .post("/api/v1/employees")
        .send({
          employeeCode: "X",
          email: "not-email",
          password: "short",
        });

      expect(res.status).toBe(400);
    });

    it("rejects invalid managerId with 400", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .post("/api/v1/employees")
        .send({
          employeeCode: "EMP-MGR-FAIL",
          name: "Fail",
          email: "fail-mgr@example.com",
          password: "Password123!",
          role: "EMPLOYEE",
          managerId: "not-an-id",
          departmentId: fixtures.department.id,
          joiningDate: "2026-08-20",
          timezone: "Asia/Kolkata",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/v1/employees/:id", () => {
    it("updates an employee as HR", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .patch(`/api/v1/employees/${fixtures.employee.id}`)
        .send({ name: "Updated Name" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Name");
    });

    it("changes status with EMPLOYEE_STATUS_CHANGED event type", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .patch(`/api/v1/employees/${fixtures.employee.id}`)
        .send({ status: "SUSPENDED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("SUSPENDED");
    });

    it("rejects MANAGER updating with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, token)
        .patch(`/api/v1/employees/${fixtures.employee.id}`)
        .send({ name: "No Access" });

      expect(res.status).toBe(403);
    });

    it("returns 404 for missing employee", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token)
        .patch(`/api/v1/employees/507f1f77bcf86cd799439099`)
        .send({ name: "Ghost" });

      expect(res.status).toBe(404);
    });

    it("newly created employee can log in", async () => {
      const fixtures = await seedFixtures();
      const hrToken = await loginAs(application, fixtures.hr.email);

      await agentFor(application, hrToken)
        .post("/api/v1/employees")
        .send({
          employeeCode: "EMP-LOGIN",
          name: "New Login",
          email: "login@example.com",
          password: DEFAULT_TEST_PASSWORD,
          role: "EMPLOYEE",
          departmentId: fixtures.department.id,
          joiningDate: "2026-08-20",
          timezone: "Asia/Kolkata",
        })
        .expect(201);

      const res = await request(application)
        .post("/api/v1/auth/login")
        .send({
          email: "login@example.com",
          password: DEFAULT_TEST_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
    });
  });
});
