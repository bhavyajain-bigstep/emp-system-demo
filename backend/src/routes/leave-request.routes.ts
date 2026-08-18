import { Router } from "express";

import {
  approveLeaveRequest,
  createLeaveRequest,
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
 * Employee submits leave.
 */
router.post(
  "/",
  authorize("EMPLOYEE"),
  validate(createLeaveRequestSchema),
  createLeaveRequest
);

/*
 * Employee sees their own requests.
 */
router.get(
  "/my",
  authorize("EMPLOYEE"),
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

export default router;