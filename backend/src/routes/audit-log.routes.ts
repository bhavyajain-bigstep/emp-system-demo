import { Router } from "express";
import { getAuditLogs, getAuditLogById } from "../controllers/audit-log.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);
router.use(authorize("HR", "ADMIN"));

/**
 * @swagger
 * tags:
 *   - name: Audit Logs
 *     description: Audit trail for administrative review
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: List audit logs
 *     description: Requires HR or ADMIN role.
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: eventType
 *         schema: { type: string }
 *       - in: query
 *         name: actorId
 *         schema: { type: string }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: entityId
 *         schema: { type: string }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Audit logs fetched successfully
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient permissions
 */
router.get("/", getAuditLogs);

/**
 * @swagger
 * /audit-logs/{id}:
 *   get:
 *     summary: Get a single audit log by ID
 *     description: Requires HR or ADMIN role.
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Audit log fetched successfully
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Audit log not found
 */
router.get("/:id", getAuditLogById);

export default router;