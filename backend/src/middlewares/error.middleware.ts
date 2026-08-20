import { Request, Response, NextFunction } from "express";

import { AppError } from "../errors/app-error";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.headers["x-request-id"] as string | undefined;

  if (env.NODE_ENV !== "test") {
    logger.error({ err, requestId, path: req.path, method: req.method }, "Unhandled error");
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code ?? "APPLICATION_ERROR",
        requestId,
      },
    });
  }

  // Zod validation error
  if (err?.name === "ZodError" || err?.errors?.fieldErrors || err?.errors?.formErrors) {
    return res.status(400).json({
      success: false,
      message: err.message || "Validation failed",
      error: {
        code: "VALIDATION_ERROR",
        details: err.errors ?? err,
        requestId,
      },
    });
  }

  // Mongoose duplicate key error (code 11000)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
      error: { code: "DUPLICATE_KEY_ERROR", requestId },
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid format for ${err.path}: ${err.value}`,
      error: { code: "INVALID_ID_FORMAT", requestId },
    });
  }

  // Mongoose validation error
  if (err?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message || "Validation failed",
      error: { code: "VALIDATION_ERROR", requestId },
    });
  }

  // JWT errors
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: { code: "AUTHENTICATION_REQUIRED", requestId },
    });
  }

  if (err?.statusCode && typeof err.statusCode === "number") {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message || "Request error",
      error: {
        code: err.code || "REQUEST_ERROR",
        requestId,
        ...(err.errors ? { details: err.errors } : {}),
      },
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    error: { code: "INTERNAL_SERVER_ERROR", requestId },
  });
};