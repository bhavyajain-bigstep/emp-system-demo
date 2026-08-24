import { Router } from "express";

import {
  createLeaveBalance,
  getAllLeaveBalances,
  getEmployeeLeaveBalances,
  getLeaveBalance,
  getMyLeaveBalances,
  updateLeaveBalance,
} from "../controllers/leave-balance.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";

import {
  createLeaveBalanceSchema,
  updateLeaveBalanceSchema,
} from "../validators/leave-balance.validator";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Leave Balances
 *     description: Leave balance management
 */

/**
 * @swagger
 * /leave-balances:
 *   get:
 *     summary: List all leave balances
 *     description: Requires HR or ADMIN role.
 *     tags: [Leave Balances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Leave balances fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave balances fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaveBalance'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not HR or ADMIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/",
  authorize("HR", "ADMIN"),
  getAllLeaveBalances
);

/**
 * @swagger
 * /leave-balances/my:
 *   get:
 *     summary: Get my leave balances
 *     description: Returns leave balances for the authenticated employee.
 *     tags: [Leave Balances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Leave balances fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave balances fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaveBalance'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/my",
  getMyLeaveBalances
);

/**
 * @swagger
 * /leave-balances/employee/{employeeId}:
 *   get:
 *     summary: Get leave balances for a specific employee
 *     description: Requires HR or ADMIN role, or employees can view their own.
 *     tags: [Leave Balances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Leave balances fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave balances fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaveBalance'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorized to view this employee's balances
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
router.get(
  "/employee/:employeeId",
  getEmployeeLeaveBalances
);

/**
 * @swagger
 * /leave-balances/{id}:
 *   get:
 *     summary: Get a single leave balance
 *     description: Requires HR or ADMIN role.
 *     tags: [Leave Balances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave balance fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave balance fetched successfully }
 *                 data:
 *                   $ref: '#/components/schemas/LeaveBalance'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not HR or ADMIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Leave balance not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/:id",
  getLeaveBalance
);

/**
 * @swagger
 * /leave-balances:
 *   post:
 *     summary: Create a leave balance
 *     description: Requires HR or ADMIN role.
 *     tags: [Leave Balances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, leaveTypeId, year, allocated]
 *             properties:
 *               employeeId: { type: string, example: "6612abf4c1a2b3d4e5f6a7b8" }
 *               leaveTypeId: { type: string, example: "6612abf4c1a2b3d4e5f6a7b9" }
 *               year: { type: integer, example: 2026 }
 *               allocated: { type: number, example: 12 }
 *     responses:
 *       201:
 *         description: Leave balance created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave balance created successfully }
 *                 data:
 *                   $ref: '#/components/schemas/LeaveBalance'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not HR or ADMIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Leave balance already exists for this employee, leave type and year
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/",
  authorize("HR", "ADMIN"),
  validate(createLeaveBalanceSchema),
  createLeaveBalance
);

/**
 * @swagger
 * /leave-balances/{id}:
 *   patch:
 *     summary: Update leave balance allocation
 *     description: Requires HR or ADMIN role. Adjusts allocated balance and recalculates available.
 *     tags: [Leave Balances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [allocated]
 *             properties:
 *               allocated: { type: number, example: 15 }
 *     responses:
 *       200:
 *         description: Leave balance updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave balance updated successfully }
 *                 data:
 *                   $ref: '#/components/schemas/LeaveBalance'
 *       400:
 *         description: Validation failed or allocated less than used
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authenticated but not HR or ADMIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Leave balance not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/:id",
  authorize("HR", "ADMIN"),
  validate(updateLeaveBalanceSchema),
  updateLeaveBalance
);

export default router;