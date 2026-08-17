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

const router = Router();

router.get("/", getEmployees);

router.get("/:id", getEmployee);

router.post(
  "/",
  validate(createEmployeeSchema),
  createEmployee
);

router.patch(
  "/:id",
  validate(updateEmployeeSchema),
  updateEmployee
);

export default router;