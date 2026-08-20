import { Request, Response, NextFunction } from "express";
import { getAuditLogsService } from "../services/audit-log.service";
import { AppError } from "../errors/app-error";
import { getPagination } from "../utils/pagination.util";

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit } = getPagination(req.query.page, req.query.limit, 50);

    const filter: Record<string, any> = {};

    if (req.query.eventType) {
      filter.action = req.query.eventType;
    }
    if (req.query.actorId) {
      filter.actorId = req.query.actorId;
    }
    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }
    if (req.query.entityId) {
      filter.entityId = req.query.entityId;
    }
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      if (req.query.fromDate) {
        filter.createdAt.$gte = new Date(req.query.fromDate as string);
      }
      if (req.query.toDate) {
        filter.createdAt.$lte = new Date(req.query.toDate as string);
      }
    }

    const result = await getAuditLogsService(filter, page, limit);

    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
      data: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { findAuditLogs } = await import("../repositories/audit-log.repository");
    const { logs, total } = await findAuditLogs({ _id: req.params.id }, 0, 1);

    if (total === 0) {
      throw new AppError("Audit log not found", 404, "AUDIT_LOG_NOT_FOUND");
    }

    return res.status(200).json({
      success: true,
      message: "Audit log fetched successfully",
      data: logs[0],
    });
  } catch (error) {
    next(error);
  }
};