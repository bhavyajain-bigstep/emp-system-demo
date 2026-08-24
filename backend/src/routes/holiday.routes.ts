import { Router } from "express";

import {
  createHoliday,
  deleteHoliday,
  getHoliday,
  getHolidays,
  updateHoliday,
} from "../controllers/holiday.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";

import {
  createHolidaySchema,
  updateHolidaySchema,
} from "../validators/holiday.validator";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Holidays
 *     description: Company holiday management
 */

/**
 * @swagger
 * /holidays:
 *   get:
 *     summary: List all holidays
 *     description: Returns all company holidays. Accessible to all authenticated roles.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Holidays fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Holidays fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Holiday'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authorize("EMPLOYEE", "MANAGER", "HR", "ADMIN"), getHolidays);

/**
 * @swagger
 * /holidays/{id}:
 *   get:
 *     summary: Get a single holiday
 *     description: Returns a specific holiday by ID. Accessible to all authenticated roles.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Holiday fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Holiday fetched successfully }
 *                 data:
 *                   $ref: '#/components/schemas/Holiday'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Holiday not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", authorize("EMPLOYEE", "MANAGER", "HR", "ADMIN"), getHoliday);

/**
 * @swagger
 * /holidays:
 *   post:
 *     summary: Create a holiday
 *     description: Creates a new company holiday. Requires HR or ADMIN role.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, name]
 *             properties:
 *               date: { type: string, format: date, example: "2026-08-15" }
 *               name: { type: string, example: "Independence Day" }
 *               optional: { type: boolean, default: false }
 *               description: { type: string, example: "National Holiday" }
 *     responses:
 *       201:
 *         description: Holiday created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Holiday created successfully }
 *                 data:
 *                   $ref: '#/components/schemas/Holiday'
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
 *         description: Holiday already exists for this date
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/",
  authorize("HR", "ADMIN"),
  validate(createHolidaySchema),
  createHoliday,
);

/**
 * @swagger
 * /holidays/{id}:
 *   patch:
 *     summary: Update a holiday
 *     description: Updates an existing holiday. Requires HR or ADMIN role.
 *     tags: [Holidays]
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
 *             properties:
 *               date: { type: string, format: date, example: "2026-08-15" }
 *               name: { type: string, example: "Independence Day" }
 *               optional: { type: boolean }
 *               description: { type: string, example: "National Holiday" }
 *     responses:
 *       200:
 *         description: Holiday updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Holiday updated successfully }
 *                 data:
 *                   $ref: '#/components/schemas/Holiday'
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
 *         description: Holiday not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Another holiday already exists for this date
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/:id",
  authorize("HR", "ADMIN"),
  validate(updateHolidaySchema),
  updateHoliday,
);

/**
 * @swagger
 * /holidays/{id}:
 *   delete:
 *     summary: Delete a holiday
 *     description: Deletes a holiday. Requires HR or ADMIN role.
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Holiday deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Holiday deleted successfully }
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
 *         description: Holiday not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", authorize("HR", "ADMIN"), deleteHoliday);

export default router;
