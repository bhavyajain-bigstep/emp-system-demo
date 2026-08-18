import express from "express";

import authRoutes from "./routes/auth.routes";
import employeeRoutes from "./routes/employee.routes";
import departmentRoutes from "./routes/department.routes";
import leaveTypeRoutes from "./routes/leave-type.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Employee Leave Management API is running",
  });
});

app.use(
  "/api/v1/leave-types",
  leaveTypeRoutes
);

app.use(
  "/api/v1/auth",
  authRoutes
);

app.use(
  "/api/v1/employees",
  employeeRoutes
);

app.use(
  "/api/v1/departments",
  departmentRoutes
);

app.use(errorHandler);

export default app;