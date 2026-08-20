import { ClientSession, Types } from "mongoose";
import { createAuditLog, findAuditLogs } from "../repositories/audit-log.repository";

interface LogActionInput {
  actorId?: string | Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string | Types.ObjectId;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  session?: ClientSession;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "JWT_SECRET",
]);

function sanitize(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (obj instanceof Date || obj instanceof Types.ObjectId) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean: Record<string, any> = {};
  const raw = typeof obj.toObject === "function" ? obj.toObject() : obj;

  for (const [key, value] of Object.entries(raw)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }
    clean[key] = sanitize(value);
  }
  return clean;
}

export const logAuditEvent = async (input: LogActionInput) => {
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

    return await createAuditLog(
      {
        actorId,
        action: input.action,
        entityType: input.entityType,
        entityId,
        oldValue: input.oldValue ? sanitize(input.oldValue) : undefined,
        newValue: input.newValue ? sanitize(input.newValue) : undefined,
        metadata: input.metadata ? sanitize(input.metadata) : undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      input.session
    );
  } catch (error) {
    // Non-blocking error for audit logging failure
    console.error("Audit log error:", error);
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
