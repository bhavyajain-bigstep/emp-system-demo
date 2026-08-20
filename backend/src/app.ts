import express from "express";
import cors from "cors";
import helmet from "helmet";
// @ts-ignore
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { connectDB, disconnectDB } from "./config/db";
import { logger, httpLogger } from "./utils/logger";

import attendanceRoutes from "./routes/attendance.route";
import authRoutes from "./routes/auth.routes";
import employeeRoutes from "./routes/employee.routes";
import departmentRoutes from "./routes/department.routes";
import leaveTypeRoutes from "./routes/leave-type.routes";
import { errorHandler } from "./middlewares/error.middleware";
import leaveRequestRoutes from "./routes/leave-request.routes";
import holidayRoutes from "./routes/holiday.routes";
import reportRoutes from "./routes/report.routes";
import auditLogRoutes from "./routes/audit-log.routes";
import leaveBalanceRoutes from "./routes/leave-balance.routes";

const app = express();

// Trust proxy for rate limiter behind reverse proxy
app.set("trust proxy", 1);

// Body parser with size limit
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Cookie parser for refresh token
app.use(cookieParser());

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "font-src": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
);

// CORS restricted to frontend origin
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Global rate limiter (except health)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    error: { code: "RATE_LIMIT_EXCEEDED" },
  },
  skip: (req) => req.path === "/health",
});
app.use(globalLimiter);

// Request logging
app.use(httpLogger);

// Health check with DB verification
app.get("/health", async (_req, res) => {
  const mongoose = await import("mongoose");
  const dbState = mongoose.default.connection.readyState; // 1 = connected
  if (dbState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Service unavailable - database disconnected",
    });
  }
  res.status(200).json({
    success: true,
    message: "Employee Leave Management API is running",
  });
});

// Swagger only in non-production
if (env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Auth stricter rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
    error: { code: "AUTH_RATE_LIMIT_EXCEEDED" },
  },
});
app.use("/api/v1/auth", authLimiter);

// Routes
app.use("/api/v1/leaves", leaveRequestRoutes);
app.use("/api/v1/holidays", holidayRoutes);
app.use("/api/v1/leave-balances", leaveBalanceRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/leave-types", leaveTypeRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
    },
  });
});

app.use(errorHandler);

export default app;
