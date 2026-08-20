import { ClientSession } from "mongoose";
import { AuditLog, IAuditLog } from "../models/audit-log.model";

export const createAuditLog = async (
  data: Partial<IAuditLog>,
  session?: ClientSession
): Promise<IAuditLog> => {
  if (session) {
    const [log] = await AuditLog.create([data], { session });
    return log;
  }
  return AuditLog.create(data);
};

export const findAuditLogs = async (
  filter: Record<string, any>,
  skip = 0,
  limit = 50
) => {
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actorId", "employeeCode name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total };
};
