import {
  Request,
  Response,
  NextFunction,
} from "express";

import { AppError } from "../errors/app-error";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Don't clutter logs in test environment unless needed
  if (process.env.NODE_ENV !== "test") {
    console.error("Error:", err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code ?? "APPLICATION_ERROR",
      },
    });
  }

  // Zod validation error or object with errors
  if (err?.name === "ZodError" || err?.errors?.fieldErrors || err?.errors?.formErrors) {
    return res.status(400).json({
      success: false,
      message: err.message || "Validation failed",
      error: {
        code: "VALIDATION_ERROR",
        details: err.errors ?? err,
      },
    });
  }

  // Mongoose duplicate key error (code 11000)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
      error: {
        code: "DUPLICATE_KEY_ERROR",
      },
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid format for ${err.path}: ${err.value}`,
      error: {
        code: "INVALID_ID_FORMAT",
      },
    });
  }

  // Mongoose validation error
  if (err?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message || "Validation failed",
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  }

  // JWT errors
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: {
        code: "AUTHENTICATION_REQUIRED",
      },
    });
  }

  if (err?.statusCode && typeof err.statusCode === "number") {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message || "Request error",
      error: {
        code: err.code || "REQUEST_ERROR",
        ...(err.errors ? { details: err.errors } : {}),
      },
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    error: {
      code: "INTERNAL_SERVER_ERROR",
    },
  });
};