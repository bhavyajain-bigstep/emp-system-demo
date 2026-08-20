import { Router } from "express";

import { login, refresh, logout } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema } from "../validators/auth.validator";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Login successful }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT bearer token
 *                     user:
 *                       $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/login",
  validate(loginSchema),
  login
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using httpOnly cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Refresh token missing or invalid
 */
router.post("/refresh", refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out and clear refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", logout);

export default router;