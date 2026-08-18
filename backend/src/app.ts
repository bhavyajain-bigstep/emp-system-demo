import express from "express";
import cors from "cors";
import helmet from "helmet";
import attendanceRoutes from "./routes/attendance.route";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parser
app.use(express.json());

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Employee Leave Management API is running",
  });
});

app.use(attendanceRoutes);

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

export default app;
