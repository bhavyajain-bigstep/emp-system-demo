import { Types } from "mongoose";

import {
  logAuditEvent,
  getAuditLogsService,
  AuditEventType,
} from "../../src/services/audit-log.service";
import { AuditLog } from "../../src/models/audit-log.model";
import { setupTestDb } from "../helpers/test-db";

setupTestDb();

describe("audit-log.service", () => {
  describe("AuditEventType enum", () => {
    it("exposes the documented event types", () => {
      expect(AuditEventType.AUTH_LOGIN_SUCCESS).toBe("AUTH_LOGIN_SUCCESS");
      expect(AuditEventType.AUTH_LOGIN_FAILED).toBe("AUTH_LOGIN_FAILED");
      expect(AuditEventType.EMPLOYEE_CREATED).toBe("EMPLOYEE_CREATED");
      expect(AuditEventType.LEAVE_REQUEST_APPROVED).toBe("LEAVE_REQUEST_APPROVED");
      expect(AuditEventType.HOLIDAY_DELETED).toBe("HOLIDAY_DELETED");
    });
  });

  describe("logAuditEvent", () => {
    it("persists an audit entry to the database", async () => {
      const actorId = new Types.ObjectId().toString();
      const entityId = new Types.ObjectId().toString();

      const result = await logAuditEvent({
        eventType: AuditEventType.EMPLOYEE_CREATED,
        actorId,
        actorRole: "HR",
        entityType: "EMPLOYEE",
        entityId,
        newValue: { name: "Test" },
      });

      expect(result).not.toBeNull();

      const stored = await AuditLog.findOne({});
      expect(stored).not.toBeNull();
      expect(stored!.action).toBe(AuditEventType.EMPLOYEE_CREATED);
      expect(stored!.entityType).toBe("EMPLOYEE");
    });

    it("strips sensitive fields from oldValue/newValue", async () => {
      await logAuditEvent({
        eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
        actorId: new Types.ObjectId().toString(),
        actorRole: "EMPLOYEE",
        entityType: "EMPLOYEE",
        entityId: new Types.ObjectId().toString(),
        newValue: { password: "should-be-removed", token: "secret", name: "kept" },
      });

      const stored = await AuditLog.findOne({});
      const storedValue = stored!.newValue as Record<string, unknown> | undefined;
      expect(storedValue).toBeDefined();
      expect(Object.keys(storedValue!)).not.toContain("password");
      expect(Object.keys(storedValue!)).not.toContain("token");
      expect(storedValue!.name).toBe("kept");
    });

    it("ignores invalid entityId but still persists the log", async () => {
      const result = await logAuditEvent({
        eventType: AuditEventType.AUTH_LOGIN_FAILED,
        entityType: "EMPLOYEE",
        entityId: "not-an-objectid",
      });
      expect(result).not.toBeNull();
      const stored = await AuditLog.findOne({});
      expect(stored).not.toBeNull();
    });

    it("does not throw when persist fails", async () => {
      const spy = jest
        .spyOn(AuditLog, "create")
        .mockRejectedValueOnce(new Error("db down"));

      await expect(
        logAuditEvent({
          eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
          entityType: "EMPLOYEE",
          entityId: new Types.ObjectId().toString(),
        })
      ).resolves.toBeNull();

      spy.mockRestore();
    });
  });

  describe("getAuditLogsService", () => {
    it("returns paginated results", async () => {
      for (let i = 0; i < 25; i++) {
        await AuditLog.create({
          action: AuditEventType.EMPLOYEE_CREATED,
          entityType: "EMPLOYEE",
          entityId: new Types.ObjectId(),
        });
      }

      const result = await getAuditLogsService({}, 1, 10);
      expect(result.logs.length).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it("filters by action and entityType", async () => {
      await AuditLog.create({
        action: AuditEventType.EMPLOYEE_CREATED,
        entityType: "EMPLOYEE",
        entityId: new Types.ObjectId(),
      });
      await AuditLog.create({
        action: AuditEventType.LEAVE_REQUEST_APPROVED,
        entityType: "LEAVE_REQUEST",
        entityId: new Types.ObjectId(),
      });

      const result = await getAuditLogsService({
        action: AuditEventType.LEAVE_REQUEST_APPROVED,
      });
      expect(result.logs.length).toBe(1);
      expect(result.logs[0].action).toBe(AuditEventType.LEAVE_REQUEST_APPROVED);
    });
  });
});
