import { Router } from "express";

import {
  createLeaveType,
  deleteLeaveType,
  getLeaveType,
  getLeaveTypes,
  updateLeaveType,
} from "../controllers/leave-type.controller";

const router = Router();

router.get(
  "/",
  getLeaveTypes
);

router.get(
  "/:id",
  getLeaveType
);

router.post(
  "/",
  createLeaveType
);

router.patch(
  "/:id",
  updateLeaveType
);

router.delete(
  "/:id",
  deleteLeaveType
);

export default router;