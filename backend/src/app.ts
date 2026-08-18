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

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Employee Leave Management API is running",
  });
});

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
