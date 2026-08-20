import type { Application } from "express";
import { Types } from "mongoose";

import app from "../../src/app";
import { AuditLog } from "../../src/models/audit-log.model";
import {
  logAuditEvent,
  AuditEventType,
} from "../../src/services/audit-log.service";
import { connectTestDb, disconnectTestDb, clearTestDb } from "./setup";
import {
  seedFixtures,
  loginAs,
  agentFor,
} from "./helpers";

describe("Audit Logs API", () => {
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

  const seedAuditLogs = async (actorId: string) => {
    await AuditLog.insertMany([
      {
        actorId: new Types.ObjectId(actorId),
        action: AuditEventType.EMPLOYEE_CREATED,
        entityType: "EMPLOYEE",
        entityId: new Types.ObjectId(),
      },
      {
        actorId: new Types.ObjectId(actorId),
        action: AuditEventType.AUTH_LOGIN_SUCCESS,
        entityType: "EMPLOYEE",
        entityId: new Types.ObjectId(actorId),
      },
      {
        actorId: new Types.ObjectId(actorId),
        action: AuditEventType.LEAVE_REQUEST_APPROVED,
        entityType: "LEAVE_REQUEST",
        entityId: new Types.ObjectId(),
      },
    ]);
  };

  describe("GET /api/v1/audit-logs", () => {
    it("returns the audit log list for HR", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);
      await AuditLog.deleteMany({});
      await seedAuditLogs(fixtures.hr.id);

      const res = await agentFor(application, token).get(
        "/api/v1/audit-logs"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 50 });
    });

    it("returns the audit log list for ADMIN", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.admin.email);
      await AuditLog.deleteMany({});
      await seedAuditLogs(fixtures.admin.id);

      const res = await agentFor(application, token).get(
        "/api/v1/audit-logs"
      );
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it("rejects EMPLOYEE with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.employee.email);

      const res = await agentFor(application, token).get(
        "/api/v1/audit-logs"
      );
      expect(res.status).toBe(403);
    });

    it("rejects MANAGER with 403", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.manager.email);

      const res = await agentFor(application, token).get(
        "/api/v1/audit-logs"
      );
      expect(res.status).toBe(403);
    });

    it("filters by eventType", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);
      await AuditLog.deleteMany({});
      await seedAuditLogs(fixtures.hr.id);

      const res = await agentFor(application, token)
        .get("/api/v1/audit-logs")
        .query({ eventType: AuditEventType.AUTH_LOGIN_SUCCESS });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].action).toBe(AuditEventType.AUTH_LOGIN_SUCCESS);
    });

    it("filters by entityType", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);
      await AuditLog.deleteMany({});
      await seedAuditLogs(fixtures.hr.id);

      const res = await agentFor(application, token)
        .get("/api/v1/audit-logs")
        .query({ entityType: "LEAVE_REQUEST" });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("filters by actorId", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);
      await AuditLog.deleteMany({});

      const targetActor = new Types.ObjectId().toString();
      await logAuditEvent({
        eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
        actorId: targetActor,
        entityType: "EMPLOYEE",
        entityId: targetActor,
      });

      const res = await agentFor(application, token)
        .get("/api/v1/audit-logs")
        .query({ actorId: targetActor });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("supports date range filtering", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);
      await AuditLog.deleteMany({});

      await AuditLog.create({
        actorId: new Types.ObjectId(fixtures.hr.id),
        action: AuditEventType.EMPLOYEE_CREATED,
        entityType: "EMPLOYEE",
        entityId: new Types.ObjectId(),
        createdAt: new Date("2026-01-15"),
      });
      await AuditLog.create({
        actorId: new Types.ObjectId(fixtures.hr.id),
        action: AuditEventType.EMPLOYEE_CREATED,
        entityType: "EMPLOYEE",
        entityId: new Types.ObjectId(),
        createdAt: new Date("2026-08-15"),
      });

      const res = await agentFor(application, token)
        .get("/api/v1/audit-logs")
        .query({ fromDate: "2026-07-01T00:00:00.000Z" });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("supports pagination", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);
      await AuditLog.deleteMany({});

      const bulk = Array.from({ length: 30 }, () => ({
        actorId: new Types.ObjectId(fixtures.hr.id),
        action: AuditEventType.EMPLOYEE_CREATED,
        entityType: "EMPLOYEE",
        entityId: new Types.ObjectId(),
      }));
      await AuditLog.insertMany(bulk);

      const res = await agentFor(application, token)
        .get("/api/v1/audit-logs")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(10);
      expect(res.body.pagination.total).toBe(30);
      expect(res.body.pagination.totalPages).toBe(3);
    });
  });

  describe("GET /api/v1/audit-logs/:id", () => {
    it("returns a single audit log by id", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const log = await AuditLog.create({
        actorId: new Types.ObjectId(fixtures.hr.id),
        action: AuditEventType.EMPLOYEE_CREATED,
        entityType: "EMPLOYEE",
        entityId: new Types.ObjectId(),
      });

      const res = await agentFor(application, token).get(
        `/api/v1/audit-logs/${log._id.toString()}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.action).toBe(AuditEventType.EMPLOYEE_CREATED);
    });

    it("returns 404 for a missing log", async () => {
      const fixtures = await seedFixtures();
      const token = await loginAs(application, fixtures.hr.email);

      const res = await agentFor(application, token).get(
        `/api/v1/audit-logs/${new Types.ObjectId().toString()}`
      );

      expect(res.status).toBe(404);
    });
  });
});
