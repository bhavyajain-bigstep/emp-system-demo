import { Router } from "express";

import {
  checkIn,
  checkOut,
  getAttendanceList,
  getMonthlySummary,
} from "../controllers/attendance.controller";

const router = Router();

// employeeId comes from the route param for now — no auth middleware yet
// to derive it from a session. Once auth lands, self check-in/out should
// read employeeId from req.user; keep :employeeId here for HR/Admin
// manual entry use cases.

router.post("/:employeeId/check-in", checkIn);
router.post("/:employeeId/check-out", checkOut);
router.get("/:employeeId/summary", getMonthlySummary);
router.get("/", getAttendanceList);

export default router;