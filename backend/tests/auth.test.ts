import request from "supertest";

import app from "../src/app";
import {
  TEST_PASSWORD,
  seedDepartment,
  seedEmployee,
  tokenFor,
} from "./helpers";

describe("Auth", () => {
  describe("POST /api/v1/auth/login", () => {
    it("logs in with valid credentials", async () => {
      const dept = await seedDepartment("Engineering");
      const employee = await seedEmployee({
        email: "admin@example.com",
        password: TEST_PASSWORD,
        role: "ADMIN",
        departmentId: dept._id,
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@example.com", password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).toMatchObject({
        id: employee._id.toString(),
        email: "admin@example.com",
        role: "ADMIN",
      });
    });

    it("rejects a wrong password with 401 INVALID_CREDENTIALS", async () => {
      const dept = await seedDepartment("Engineering");
      await seedEmployee({
        email: "user@example.com",
        password: TEST_PASSWORD,
        departmentId: dept._id,
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "user@example.com", password: "WrongPassword1" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("rejects an unknown email with 401 INVALID_CREDENTIALS", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "nobody@example.com", password: TEST_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("rejects login for an inactive account with 403 ACCOUNT_INACTIVE", async () => {
      const dept = await seedDepartment("Engineering");
      await seedEmployee({
        email: "inactive@example.com",
        password: TEST_PASSWORD,
        departmentId: dept._id,
        status: "INACTIVE",
      });

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "inactive@example.com", password: TEST_PASSWORD });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    });

    it("rejects invalid input with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "not-an-email", password: "short" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for missing login route", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });

  describe("Authentication middleware", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/api/v1/employees");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("returns 401 for a malformed authorization header", async () => {
      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", "Token abc");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_AUTH_HEADER");
    });

    it("returns 401 for an invalid token", async () => {
      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", "Bearer not.a.valid.token");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("allows authenticated access with a valid token", async () => {
      const dept = await seedDepartment("Engineering");
      const employee = await seedEmployee({
        role: "ADMIN",
        departmentId: dept._id,
      });

      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${tokenFor(employee)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Role-based authorization", () => {
    it("forbids an EMPLOYEE from listing all employees (403)", async () => {
      const dept = await seedDepartment("Engineering");
      const employee = await seedEmployee({ departmentId: dept._id });

      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${tokenFor(employee)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("forbids an EMPLOYEE from creating an employee (403)", async () => {
      const dept = await seedDepartment("Engineering");
      const employee = await seedEmployee({ departmentId: dept._id });

      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${tokenFor(employee)}`)
        .send({
          employeeCode: "EMP-X",
          name: "New Person",
          email: "new@example.com",
          password: TEST_PASSWORD,
          departmentId: dept._id.toString(),
          joiningDate: "2026-02-01",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows an HR user to list employees", async () => {
      const dept = await seedDepartment("Engineering");
      await seedEmployee({ departmentId: dept._id });
      const hr = await seedEmployee({ role: "HR", departmentId: dept._id });

      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${tokenFor(hr)}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("does not expose passwordHash through the API", async () => {
      const dept = await seedDepartment("Engineering");
      await seedEmployee({ departmentId: dept._id });
      const hr = await seedEmployee({ role: "HR", departmentId: dept._id });

      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${tokenFor(hr)}`);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    });

    it("rejects a token issued with a tampered signature", async () => {
      const dept = await seedDepartment("Engineering");
      const employee = await seedEmployee({ role: "ADMIN", departmentId: dept._id });
      const token = tokenFor(employee);

      const tampered = token.slice(0, -4) + "abcd";

      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${tampered}`);

      expect(res.status).toBe(401);
    });
  });

  describe("Health", () => {
    it("returns the health payload without authentication", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});