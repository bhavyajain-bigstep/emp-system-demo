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

router.get(
  "/",
  authorize("HR", "ADMIN"),
  getEmployees
);

router.get(
  "/:id",
  authorize("HR", "ADMIN"),
  getEmployee
);

router.post(
  "/",
  authorize("HR", "ADMIN"),
  validate(createEmployeeSchema),
  createEmployee
);

router.patch(
  "/:id",
  authorize("HR", "ADMIN"),
  validate(updateEmployeeSchema),
  updateEmployee
);

export default router;