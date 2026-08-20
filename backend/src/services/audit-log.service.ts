import { Types } from "mongoose";
import { createAuditLog, findAuditLogs } from "../repositories/audit-log.repository";
import { logger, AuditLogEntry } from "../utils/logger";

export enum AuditEventType {
  EMPLOYEE_CREATED = "EMPLOYEE_CREATED",
  EMPLOYEE_UPDATED = "EMPLOYEE_UPDATED",
  EMPLOYEE_STATUS_CHANGED = "EMPLOYEE_STATUS_CHANGED",
  EMPLOYEE_DELETED = "EMPLOYEE_DELETED",

  DEPARTMENT_CREATED = "DEPARTMENT_CREATED",
  DEPARTMENT_UPDATED = "DEPARTMENT_UPDATED",
  DEPARTMENT_ARCHIVED = "DEPARTMENT_ARCHIVED",

  LEAVE_TYPE_CREATED = "LEAVE_TYPE_CREATED",
  LEAVE_TYPE_UPDATED = "LEAVE_TYPE_UPDATED",
  LEAVE_TYPE_DELETED = "LEAVE_TYPE_DELETED",

  LEAVE_BALANCE_CREATED = "LEAVE_BALANCE_CREATED",
  LEAVE_BALANCE_UPDATED = "LEAVE_BALANCE_UPDATED",
  LEAVE_BALANCE_DEDUCTED = "LEAVE_BALANCE_DEDUCTED",
  LEAVE_BALANCE_RESTORED = "LEAVE_BALANCE_RESTORED",

  LEAVE_REQUEST_CREATED = "LEAVE_REQUEST_CREATED",
  LEAVE_REQUEST_APPROVED = "LEAVE_REQUEST_APPROVED",
  LEAVE_REQUEST_REJECTED = "LEAVE_REQUEST_REJECTED",
  LEAVE_REQUEST_CANCELLED = "LEAVE_REQUEST_CANCELLED",

  ATTENDANCE_CHECK_IN = "ATTENDANCE_CHECK_IN",
  ATTENDANCE_CHECK_OUT = "ATTENDANCE_CHECK_OUT",
  ATTENDANCE_RECORD_UPDATED = "ATTENDANCE_RECORD_UPDATED",

  HOLIDAY_CREATED = "HOLIDAY_CREATED",
  HOLIDAY_UPDATED = "HOLIDAY_UPDATED",
  HOLIDAY_DELETED = "HOLIDAY_DELETED",

  AUTH_LOGIN_SUCCESS = "AUTH_LOGIN_SUCCESS",
  AUTH_LOGIN_FAILED = "AUTH_LOGIN_FAILED",
  AUTH_TOKEN_REFRESHED = "AUTH_TOKEN_REFRESHED",
  AUTH_UNAUTHORIZED_ACCESS = "AUTH_UNAUTHORIZED_ACCESS",
}

interface LogActionInput {
  eventType: AuditEventType;
  actorId?: string | Types.ObjectId;
  actorRole?: string;
  entityType: string;
  entityId?: string | Types.ObjectId;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "JWT_SECRET",
  "authorization",
  "cookie",
]);

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (obj instanceof Date || obj instanceof Types.ObjectId) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean: Record<string, unknown> = {};
  const raw = typeof (obj as any).toObject === "function" ? (obj as any).toObject() : obj;

  for (const [key, value] of Object.entries(raw)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }
    clean[key] = sanitize(value);
  }
  return clean;
}

export const logAuditEvent = async (input: LogActionInput) => {
  const correlationId = input.correlationId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  try {
    const actorId = input.actorId
      ? typeof input.actorId === "string" && Types.ObjectId.isValid(input.actorId)
        ? new Types.ObjectId(input.actorId)
        : input.actorId instanceof Types.ObjectId
        ? input.actorId
        : undefined
      : undefined;

    const entityId = input.entityId
      ? typeof input.entityId === "string" && Types.ObjectId.isValid(input.entityId)
        ? new Types.ObjectId(input.entityId)
        : input.entityId instanceof Types.ObjectId
        ? input.entityId
        : undefined
      : undefined;

    const auditEntry = await createAuditLog({
      actorId,
      action: input.eventType,
      entityType: input.entityType,
      entityId,
      oldValue: input.oldValue ? (sanitize(input.oldValue) as Record<string, unknown>) : undefined,
      newValue: input.newValue ? (sanitize(input.newValue) as Record<string, unknown>) : undefined,
      metadata: input.metadata ? (sanitize(input.metadata) as Record<string, unknown>) : undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    const logEntry: AuditLogEntry = {
      eventType: input.eventType,
      actorId: actorId?.toString(),
      actorRole: input.actorRole,
      entityType: input.entityType,
      entityId: entityId?.toString() ?? "",
      action: input.eventType,
      oldValue: input.oldValue ? (sanitize(input.oldValue) as Record<string, unknown>) : undefined,
      newValue: input.newValue ? (sanitize(input.newValue) as Record<string, unknown>) : undefined,
      metadata: input.metadata ? (sanitize(input.metadata) as Record<string, unknown>) : undefined,
      correlationId,
      timestamp: new Date(),
    };

    logger.audit(logEntry);

    return auditEntry;
  } catch (error) {
    logger.error("Audit log persistence failed", {
      eventType: input.eventType,
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
};

export const getAuditLogsService = async (
  filter: Record<string, any>,
  page = 1,
  limit = 20
) => {
  const skip = (page - 1) * limit;
  const result = await findAuditLogs(filter, skip, limit);

  return {
    ...result,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
};