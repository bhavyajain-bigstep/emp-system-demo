import { Router } from "express";

import {
  createHoliday,
  deleteHoliday,
  getHoliday,
  getHolidays,
  updateHoliday,
} from "../controllers/holiday.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validate.middleware";

import {
  createHolidaySchema,
  updateHolidaySchema,
} from "../validators/holiday.validator";

const router = Router();

router.use(
  authenticate
);

/*
 * GET
 *
 * Employees, managers and HR
 * can view holidays.
 */
router.get(
  "/",
  authorize(
    "EMPLOYEE",
    "MANAGER",
    "HR",
    "ADMIN"
  ),
  getHolidays
);

router.get(
  "/:id",
  authorize(
    "EMPLOYEE",
    "MANAGER",
    "HR",
    "ADMIN"
  ),
  getHoliday
);

/*
 * HR/Admin management
 */
router.post(
  "/",
  authorize(
    "HR",
    "ADMIN"
  ),
  validate(
    createHolidaySchema
  ),
  createHoliday
);

router.patch(
  "/:id",
  authorize(
    "HR",
    "ADMIN"
  ),
  validate(
    updateHolidaySchema
  ),
  updateHoliday
);

router.delete(
  "/:id",
  authorize(
    "HR",
    "ADMIN"
  ),
  deleteHoliday
);

export default router;