import { Router } from "express";

import {
  archiveDepartment,
  createDepartment,
  getDepartment,
  getDepartments,
  updateDepartment,
} from "../controllers/department.controller";

import { validate } from "../middlewares/validate.middleware";

import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validators/department.validator";

const router = Router();

// NOTE: no authenticate/authorize middleware yet — matches the current
// (unauthenticated) state of employee.routes.ts. Tighten both together
// once auth.middleware.ts / role.middleware.ts actually exist.

router.get("/", getDepartments);

router.get("/:id", getDepartment);

router.post("/", validate(createDepartmentSchema), createDepartment);

router.patch(
  "/:id",
  validate(updateDepartmentSchema),
  updateDepartment
);

router.delete("/:id", archiveDepartment);

export default router;