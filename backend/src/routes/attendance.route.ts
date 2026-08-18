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

/**
 * @swagger
 * tags:
 *   - name: Attendance
 *     description: Check-in/check-out and attendance reporting
 */

/**
 * @swagger
 * /attendance/{employeeId}/check-in:
 *   post:
 *     summary: Check in an employee for today (their local calendar date)
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *         description: >
 *           Temporary — will move to req.user once auth lands. Currently
 *           anyone can check in any employee.
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Employee has already checked in for today
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:employeeId/check-in", checkIn);

/**
 * @swagger
 * /attendance/{employeeId}/check-out:
 *   post:
 *     summary: Check out an employee for today (their local calendar date)
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *         description: >
 *           Temporary — will move to req.user once auth lands.
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Employee not found, or no check-in found for today
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Employee has already checked out for today
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:employeeId/check-out", checkOut);

/**
 * @swagger
 * /attendance/{employeeId}/summary:
 *   get:
 *     summary: Get an employee's monthly attendance summary
 *     description: >
 *       Working-day count currently excludes configured weekend days only —
 *       company holidays are not yet factored in (see `holidaysExcluded` in
 *       the response, which will be `false` until the Leave module's
 *       Holiday collection is wired in).
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *         description: Defaults to the current year if omitted.
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12, example: 8 }
 *         description: Defaults to the current month if omitted.
 *     responses:
 *       200:
 *         description: Monthly attendance summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message:
 *                   type: string
 *                   example: Monthly attendance summary fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     employeeId: { type: string }
 *                     year: { type: integer, example: 2026 }
 *                     month: { type: integer, example: 8 }
 *                     workingDays: { type: integer, example: 21 }
 *                     presentDays: { type: integer, example: 15 }
 *                     lateDays: { type: integer, example: 2 }
 *                     halfDays: { type: integer, example: 1 }
 *                     leaveDays: { type: integer, example: 1 }
 *                     absentDays: { type: integer, example: 2 }
 *                     holidaysExcluded:
 *                       type: boolean
 *                       example: false
 *                       description: Will be true once Holiday exclusion is wired in.
 *       400:
 *         description: Invalid employee id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:employeeId/summary", getMonthlySummary);

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: List attendance records
 *     tags: [Attendance]
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
 *         description: Local calendar date (YYYY-MM-DD), inclusive.
 *       - in: query
 *         name: to
 *         schema: { type: string, example: "2026-08-31" }
 *         description: Local calendar date (YYYY-MM-DD), inclusive.
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
 *                 message:
 *                   type: string
 *                   example: Attendance records fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get("/", getAttendanceList);

export default router;
