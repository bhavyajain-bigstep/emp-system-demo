import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { logger, createCorrelationId, LogContext } from "../utils/logger";

export interface CorrelatedRequest extends AuthenticatedRequest {
  correlationId: string;
  logContext: LogContext;
}

export const correlationMiddleware = (
  req: CorrelatedRequest,
  res: Response,
  next: NextFunction
) => {
  const correlationId =
    (req.headers["x-correlation-id"] as string) || createCorrelationId();

  req.correlationId = correlationId;
  req.logContext = {
    correlationId,
    method: req.method,
    path: req.path,
    userId: req.user?.userId,
    role: req.user?.role,
  };

  res.setHeader("X-Correlation-ID", correlationId);

  const startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const context: LogContext = {
      ...req.logContext,
      statusCode: res.statusCode,
      durationMs,
    };

    if (res.statusCode >= 500) {
      logger.error("Request completed with server error", context);
    } else if (res.statusCode >= 400) {
      logger.warn("Request completed with client error", context);
    } else {
      logger.info("Request completed", context);
    }
  });

  logger.info("Request received", req.logContext);
  next();
};