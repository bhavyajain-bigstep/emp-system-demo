import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import leaveBalanceRoutes from "./routes/leave-balance.routes";
import { swaggerSpec } from "./config/swagger";
import attendanceRoutes from "./routes/attendance.route";
import authRoutes from "./routes/auth.routes";
import employeeRoutes from "./routes/employee.routes";
import departmentRoutes from "./routes/department.routes";
import leaveTypeRoutes from "./routes/leave-type.routes";
import { errorHandler } from "./middlewares/error.middleware";
import leaveRequestRoutes from "./routes/leave-request.routes";
import holidayRoutes from "./routes/holiday.routes";
import reportRoutes from "./routes/report.routes";
import rateLimit from "express-rate-limit";

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

// Apply rate limiting on auth endpoints (disabled in test env)
if (process.env.NODE_ENV !== "test") {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many authentication requests, please try again later",
      error: { code: "RATE_LIMIT_EXCEEDED" },
    },
  });
  app.use("/api/v1/auth", authLimiter);
}

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Employee Leave Management API is running",
  });
});

app.use(
  "/api/v1/leaves",
  leaveRequestRoutes
);

app.use(
  "/api/v1/holidays",
  holidayRoutes
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(
  "/api/v1/leave-balances",
  leaveBalanceRoutes
);

app.use("/api/v1/attendance", attendanceRoutes);

app.use("/api/v1/leave-types", leaveTypeRoutes);

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/employees", employeeRoutes);

app.use("/api/v1/departments", departmentRoutes);

app.use("/api/v1/reports", reportRoutes);


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
