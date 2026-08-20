import { Router } from "express";

import {
  createEmployee,
  getEmployee,
  getEmployees,
  updateEmployee,
} from "../controllers/employee.controller";

import { validate } from "../middlewares/validate.middleware";

import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "../validators/employee.validator";

import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Employees
 *     description: Employee management
 */

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: List employees
 *     description: Requires HR or ADMIN role.
 *     tags: [Employees]
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
 *         name: departmentId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE, SUSPENDED] }
 *     responses:
 *       200:
 *         description: Employees fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Employees fetched successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
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
router.get("/", authorize("HR", "ADMIN"), getEmployees);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get a single employee
 *     description: Requires HR or ADMIN role.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Employee fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Employee fetched successfully }
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
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
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getEmployee);

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create an employee
 *     description: Requires HR or ADMIN role.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeCode, name, email, password, departmentId, joiningDate, timezone]
 *             properties:
 *               employeeCode: { type: string, example: EMP-1042 }
 *               name: { type: string, example: Jayant Kaushik }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *               role:
 *                 type: string
 *                 enum: [EMPLOYEE, MANAGER, HR, ADMIN]
 *                 default: EMPLOYEE
 *               managerId: { type: string }
 *               departmentId: { type: string }
 *               joiningDate: { type: string, format: date }
 *               timezone: { type: string, default: Asia/Kolkata }
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Employee created successfully }
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
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
 *         description: Email or employee code already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/",
  authorize("HR", "ADMIN"),
  validate(createEmployeeSchema),
  createEmployee,
);

/**
 * @swagger
 * /employees/{id}:
 *   patch:
 *     summary: Update an employee
 *     description: Requires HR or ADMIN role.
 *     tags: [Employees]
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
 *               name: { type: string }
 *               role:
 *                 type: string
 *                 enum: [EMPLOYEE, MANAGER, HR, ADMIN]
 *               managerId: { type: string }
 *               departmentId: { type: string }
 *               timezone: { type: string }
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, SUSPENDED]
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Employee updated successfully }
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
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
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/:id",
  authorize("HR", "ADMIN"),
  validate(updateEmployeeSchema),
  updateEmployee,
);

export default router;
