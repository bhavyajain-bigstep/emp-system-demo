import { Router } from "express";

import { getAuditLogs } from "../controllers/audit-log.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/*
 * Audit trail
 *
 * HR/Admin only.
 *
 * GET /api/v1/audit-logs
 */
router.get(
  "/",
  authorize("HR", "ADMIN"),
  getAuditLogs
);

export default router;