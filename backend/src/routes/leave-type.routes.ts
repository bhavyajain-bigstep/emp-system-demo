import { Router } from "express";

import {
  createLeaveType,
  deleteLeaveType,
  getLeaveType,
  getLeaveTypes,
  updateLeaveType,
} from "../controllers/leave-type.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
} from "../validators/leave-type.validator";

const router = Router();

router.use(authenticate);


/**
 * @swagger
 * tags:
 *   - name: Leave Types
 *     description: Leave type management
 */

/**
 * @swagger
 * /leave-types:
 *   get:
 *     summary: List leave types
 *     description: Requires HR or ADMIN role.
 *     tags: [Leave Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave types fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Leave types fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaveType'
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
router.get("/", getLeaveTypes);

/**
 * @swagger
 * /leave-types/{id}:
 *   get:
 *     summary: Get a single leave type
 *     description: Requires HR or ADMIN role.
 *     tags: [Leave Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leave type fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Leave type fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/LeaveType'
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
 *         description: Leave type not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getLeaveType);

/**
 * @swagger
 * /leave-types:
 *   post:
 *     summary: Create a leave type
 *     description: Requires HR or ADMIN role.
 *     tags: [Leave Types]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - maxDays
 *             properties:
 *               name:
 *                 type: string
 *                 example: Casual Leave
 *               code:
 *                 type: string
 *                 example: CL
 *               description:
 *                 type: string
 *                 example: Leave for personal or casual purposes
 *               maxDays:
 *                 type: integer
 *                 minimum: 0
 *                 example: 12
 *               isPaid:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               carryForward:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *     responses:
 *       201:
 *         description: Leave type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Leave type created successfully
 *                 data:
 *                   $ref: '#/components/schemas/LeaveType'
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
 *         description: Leave type already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/",
  authorize("HR", "ADMIN"),
  validate(createLeaveTypeSchema),
  createLeaveType
);

/**
 * @swagger
 * /leave-types/{id}:
 *   patch:
 *     summary: Update a leave type
 *     description: Requires HR or ADMIN role.
 *     tags: [Leave Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Casual Leave
 *               code:
 *                 type: string
 *                 example: CL
 *               description:
 *                 type: string
 *                 example: Leave for personal or casual purposes
 *               maxDays:
 *                 type: integer
 *                 minimum: 0
 *                 example: 15
 *               isPaid:
 *                 type: boolean
 *                 example: true
 *               carryForward:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Leave type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Leave type updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/LeaveType'
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
 *       404:
 *         description: Leave type not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/:id",
  authorize("HR", "ADMIN"),
  validate(updateLeaveTypeSchema),
  updateLeaveType
);

/**
 * @swagger
 * /leave-types/{id}:
 *   delete:
 *     summary: Delete a leave type
 *     description: Requires HR or ADMIN role.
 *     tags: [Leave Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leave type deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Leave type deleted successfully
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
 *         description: Leave type not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Leave type cannot be deleted because it is already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/:id",
  authorize("HR", "ADMIN"),
  deleteLeaveType
);

export default router;
