import { Router } from "express";

import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  getLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  rejectLeaveRequest,
} from "../controllers/leave-request.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";

import {
  createLeaveRequestSchema,
  rejectLeaveRequestSchema,
} from "../validators/leave-request.validator";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Leave Requests
 *     description: Leave request management and approval workflow
 */

/**
 * @swagger
 * /leaves:
 *   post:
 *     summary: Create a leave request
 *     description: Submit a new leave request. The employee is the authenticated user.
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leaveTypeId, fromDate, toDate, reason]
 *             properties:
 *               leaveTypeId: { type: string, example: "6612abf4c1a2b3d4e5f6a7b9" }
 *               fromDate: { type: string, format: date, example: "2026-08-20" }
 *               toDate: { type: string, format: date, example: "2026-08-22" }
 *               reason: { type: string, example: "Family event" }
 *     responses:
 *       201:
 *         description: Leave request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave request created successfully }
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       400:
 *         description: Validation failed or business rule violation
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
 *       404:
 *         description: Leave type or employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Leave request overlaps with existing request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", validate(createLeaveRequestSchema), createLeaveRequest);

/**
 * @swagger
 * /leaves/my:
 *   get:
 *     summary: Get my leave requests
 *     description: Returns all leave requests for the authenticated employee.
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave requests fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave requests fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaveRequest'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/my", getMyLeaveRequests);

/**
 * @swagger
 * /leaves/pending:
 *   get:
 *     summary: Get pending leave requests for approval
 *     description: Returns pending leave requests. Managers see their team's requests; HR/ADMIN see all.
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending leave requests fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Pending leave requests fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaveRequest'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorized (requires MANAGER, HR, or ADMIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/pending",
  authorize("MANAGER", "HR", "ADMIN"),
  getPendingLeaveRequests,
);

/**
 * @swagger
 * /leaves/{id}:
 *   get:
 *     summary: Get a single leave request
 *     description: Employees can view their own; managers can view their team's; HR/ADMIN can view all.
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave request fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave request fetched successfully }
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorized to view this request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Leave request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getLeaveRequest);

/**
 * @swagger
 * /leaves/{id}/approve:
 *   put:
 *     summary: Approve a leave request
 *     description: Approves a pending leave request and deducts from leave balance. Requires MANAGER (for team), HR, or ADMIN.
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave request approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave request approved successfully }
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       400:
 *         description: Request not pending, insufficient balance, or overlap detected
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
 *         description: Not authorized to approve this request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Leave request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  "/:id/approve",
  authorize("MANAGER", "HR", "ADMIN"),
  approveLeaveRequest,
);

/**
 * @swagger
 * /leaves/{id}/reject:
 *   put:
 *     summary: Reject a leave request
 *     description: Rejects a pending leave request. Requires MANAGER (for team), HR, or ADMIN.
 *     tags: [Leave Requests]
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
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason: { type: string, example: "Business critical period" }
 *     responses:
 *       200:
 *         description: Leave request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave request rejected successfully }
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       400:
 *         description: Request not pending or validation failed
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
 *         description: Not authorized to reject this request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Leave request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  "/:id/reject",
  authorize("MANAGER", "HR", "ADMIN"),
  validate(rejectLeaveRequestSchema),
  rejectLeaveRequest,
);

/**
 * @swagger
 * /leaves/{id}/cancel:
 *   put:
 *     summary: Cancel a leave request
 *     description: Cancels a pending or approved leave request. If approved, balance is restored. Owner, HR, or ADMIN can cancel.
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leave request cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Leave request cancelled successfully }
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       400:
 *         description: Cannot cancel (wrong status, cancellation not allowed for leave type)
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
 *         description: Not authorized to cancel this request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Leave request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:id/cancel", cancelLeaveRequest);

export default router;
