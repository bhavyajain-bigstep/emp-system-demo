import { Router } from "express";

import {
  createLeaveBalance,
  getAllLeaveBalances,
  getEmployeeLeaveBalances,
  getLeaveBalance,
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

/*
 * Employee:
 *
 * GET /api/v1/leave-balances
 *
 * This should eventually return the
 * logged-in employee's balances.
 *
 * For now HR/Admin can access the
 * complete list.
 */
router.get(
  "/",
  authorize("HR", "ADMIN"),
  getAllLeaveBalances
);

/*
 * Employee-specific balances
 */
router.get(
  "/employee/:employeeId",
  getEmployeeLeaveBalances
);

/*
 * Single balance
 */
router.get(
  "/:id",
  getLeaveBalance
);

/*
 * Create balance
 *
 * HR/Admin only.
 */
router.post(
  "/",
  authorize("HR", "ADMIN"),
  validate(createLeaveBalanceSchema),
  createLeaveBalance
);

/*
 * Update allocation
 *
 * HR/Admin only.
 */
router.patch(
  "/:id",
  authorize("HR", "ADMIN"),
  validate(updateLeaveBalanceSchema),
  updateLeaveBalance
);

export default router;