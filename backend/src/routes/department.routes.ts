import { Router } from "express";

import {
  createDepartment,
  deleteDepartment,
  getDepartment,
  getDepartments,
  updateDepartment,
} from "../controllers/department.controller";

import { authenticate } from "../middlewares/auth.middleware";

import { authorize } from "../middlewares/role.middleware";

import { validate } from "../middlewares/validate.middleware";

import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validators/department.validator";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("HR", "ADMIN"),
  getDepartments
);

router.get(
  "/:id",
  authorize("HR", "ADMIN"),
  getDepartment
);

router.post(
  "/",
  authorize("HR", "ADMIN"),
  validate(createDepartmentSchema),
  createDepartment
);

router.patch(
  "/:id",
  authorize("HR", "ADMIN"),
  validate(updateDepartmentSchema),
  updateDepartment
);

router.delete(
  "/:id",
  authorize("HR", "ADMIN"),
  deleteDepartment
);

export default router;