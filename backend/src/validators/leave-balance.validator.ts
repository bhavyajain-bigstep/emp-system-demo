import { z } from "zod";

export const createLeaveBalanceSchema =
  z.object({
    employeeId: z
      .string()
      .min(1),

    leaveTypeId: z
      .string()
      .min(1),

    year: z
      .number()
      .int()
      .min(2020)
      .max(2100),

    allocated: z
      .number()
      .min(0),
  });

export const updateLeaveBalanceSchema =
  z.object({
    allocated: z
      .number()
      .min(0),
  });