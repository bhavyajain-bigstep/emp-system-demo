import {
  NextFunction,
  Request,
  Response,
} from "express";

import { getAuditLogsService } from "../services/audit-log.service";

export const getAuditLogs =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const filter: Record<string, any> = {};

      if (req.query.action) {
        filter.action = req.query.action as string;
      }

      if (req.query.entityType) {
        filter.entityType = req.query.entityType as string;
      }

      if (req.query.entityId) {
        filter.entityId = req.query.entityId as string;
      }

      if (req.query.actorId) {
        filter.actorId = req.query.actorId as string;
      }

      if (req.query.from || req.query.to) {
        const createdAt: Record<string, Date> = {};

        if (req.query.from) {
          createdAt.$gte = new Date(req.query.from as string);
        }

        if (req.query.to) {
          createdAt.$lte = new Date(req.query.to as string);
        }

        filter.createdAt = createdAt;
      }

      const result =
        await getAuditLogsService(
          filter,
          page,
          limit
        );

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