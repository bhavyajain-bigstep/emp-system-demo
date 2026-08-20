import request from "supertest";
import type { Application } from "express";
import mongoose from "mongoose";

import app from "../../src/app";
import { Employee } from "../../src/models/employee.model";
import { Department } from "../../src/models/department.model";
import { AuditLog } from "../../src/models/audit-log.model";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./setup";
import {
  seedFixtures,
  loginAs,
  agentFor,
  DEFAULT_TEST_PASSWORD,
} from "./helpers";

describe("Auth API", () => {
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

  describe("POST /api/v1/auth/login", () => {
    it("logs in an active user and returns a token", async () => {
      const fixtures = await seedFixtures();

      const res = await request(application)
        .post("/api/v1/auth/login")
        .send({
          email: fixtures.employee.email,
          password: DEFAULT_TEST_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.user).toMatchObject({
        email: fixtures.employee.email,
        role: "EMPLOYEE",
      });
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("rejects invalid password with 401", async () => {
      const fixtures = await seedFixtures();

      const res = await request(application)
        .post("/api/v1/auth/login")
        .send({
          email: fixtures.employee.email,
          password: "wrongpassword",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("rejects unknown email with 401", async () => {
      const res = await request(application)
        .post("/api/v1/auth/login")
        .send({
          email: "ghost@example.com",
          password: "password123",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("rejects inactive accounts with 403", async () => {
      const dept = await Department.create({ name: "Eng" });
      await Employee.create({
        employeeCode: "EMP-INACT",
        name: "Inactive User",
        email: "inactive@example.com",
        passwordHash: "x",
        role: "EMPLOYEE",
        departmentId: dept._id,
        joiningDate: new Date(),
        timezone: "Asia/Kolkata",
        status: "INACTIVE",
      });

      const res = await request(application)
        .post("/api/v1/auth/login")
        .send({
          email: "inactive@example.com",
          password: "whatever",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    });

    it("rejects invalid payload with 400 validation error", async () => {
      const res = await request(application)
        .post("/api/v1/auth/login")
        .send({
          email: "not-an-email",
          password: "short",
        });

      expect(res.status).toBe(400);
    });

    it("logs an audit entry on successful login", async () => {
      const fixtures = await seedFixtures();
      await AuditLog.deleteMany({});

      await request(application)
        .post("/api/v1/auth/login")
        .send({
          email: fixtures.employee.email,
          password: DEFAULT_TEST_PASSWORD,
        });

      const logs = await AuditLog.find({});
      const successLog = logs.find((l) => l.action === "AUTH_LOGIN_SUCCESS");
      expect(successLog).toBeDefined();
    });

    it("logs an audit entry on failed login", async () => {
      const fixtures = await seedFixtures();
      await AuditLog.deleteMany({});

      await request(application)
        .post("/api/v1/auth/login")
        .send({
          email: fixtures.employee.email,
          password: "wrongpassword",
        });

      const logs = await AuditLog.find({});
      const failedLog = logs.find((l) => l.action === "AUTH_LOGIN_FAILED");
      expect(failedLog).toBeDefined();
    });
  });

  describe("Authenticated routes require a valid token", () => {
    it("returns 401 when no Authorization header is provided", async () => {
      const res = await request(application).get("/api/v1/employees");
      expect(res.status).toBe(401);
    });

    it("returns 401 when an expired/malformed token is provided", async () => {
      const res = await request(application)
        .get("/api/v1/employees")
        .set("Authorization", "Bearer not.a.token");
      expect(res.status).toBe(401);
    });

    it("returns a valid response when authenticated", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get("/api/v1/employees");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  it("closes connections cleanly between requests", async () => {
    await mongoose.connection.db?.admin().ping();
  });
});
