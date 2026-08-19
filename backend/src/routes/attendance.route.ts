import { Router } from "express";

import {
  checkIn,
  checkOut,
  getAttendanceList,
  getMonthlySummary,
} from "../controllers/attendance.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Attendance
 *     description: Check-in/check-out and attendance reporting
 */

/**
 * @swagger
 * /attendance/check-in:
 *   post:
 *     summary: Check in for the authenticated employee for today
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Checked in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Checked in successfully }
 *                 data:
 *                   $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Invalid employee id
 *       404:
 *         description: Employee not found
 *       409:
 *         description: Employee has already checked in for today
 */
router.post("/check-in", checkIn);

/**
 * @swagger
 * /attendance/check-out:
 *   post:
 *     summary: Check out for the authenticated employee for today
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Checked out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Checked out successfully }
 *                 data:
 *                   $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Invalid employee id, or check-out attempted before check-in
 *       404:
 *         description: Employee not found, or no check-in found for today
 *       409:
 *         description: Employee has already checked out for today
 */
router.post("/check-out", checkOut);

/**
 * @swagger
 * /attendance/summary:
 *   get:
 *     summary: Get monthly attendance summary
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *         description: Optional for Managers/HR to view team/employee summary. Defaults to authenticated employee.
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12, example: 8 }
 *     responses:
 *       200:
 *         description: Monthly attendance summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Monthly attendance summary fetched successfully }
 *                 data:
 *                   $ref: '#/components/schemas/MonthlyAttendanceSummary'
 */
router.get("/summary", getMonthlySummary);

router.post("/:employeeId/check-in", checkIn);
router.post("/:employeeId/check-out", checkOut);
router.get("/:employeeId/summary", getMonthlySummary);

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: List attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PRESENT, LATE, HALF_DAY, ABSENT, LEAVE]
 *       - in: query
 *         name: from
 *         schema: { type: string, example: "2026-08-01" }
 *       - in: query
 *         name: to
 *         schema: { type: string, example: "2026-08-31" }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Attendance records fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Attendance records fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get("/", getAttendanceList);

export default router;

