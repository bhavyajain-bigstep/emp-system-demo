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

/*
 * Employee (or any authenticated user) submits leave.
 */
router.post(
  "/",
  validate(createLeaveRequestSchema),
  createLeaveRequest
);

/*
 * Employee sees their own requests.
 */
router.get(
  "/my",
  getMyLeaveRequests
);

/*
 * Manager / HR approval queue.
 */
router.get(
  "/pending",
  authorize(
    "MANAGER",
    "HR",
    "ADMIN"
  ),
  getPendingLeaveRequests
);

/*
 * View single leave request.
 */
router.get(
  "/:id",
  getLeaveRequest
);

/*
 * Approve.
 */
router.put(
  "/:id/approve",
  authorize(
    "MANAGER",
    "HR",
    "ADMIN"
  ),
  approveLeaveRequest
);

/*
 * Reject.
 */
router.put(
  "/:id/reject",
  authorize(
    "MANAGER",
    "HR",
    "ADMIN"
  ),
  validate(
    rejectLeaveRequestSchema
  ),
  rejectLeaveRequest
);

/*
 * Cancel.
 */
router.put(
  "/:id/cancel",
  cancelLeaveRequest
);

export default router;