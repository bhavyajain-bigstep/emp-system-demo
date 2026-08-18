import { z } from "zod";

const leaveRulesSchema =
  z.object({
    allowNegativeBalance:
      z.boolean(),

    excludeWeekends:
      z.boolean(),

    excludeMandatoryHolidays:
      z.boolean(),

    allowHalfDay:
      z.boolean(),

    allowCancellation:
      z.boolean(),

    maxConsecutiveDays:
      z.number()
        .int()
        .min(1),

    minNoticeDays:
      z.number()
        .int()
        .min(0),
  });

export const createLeaveTypeSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(100),

    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Code can contain only letters, numbers, hyphens and underscores"
      ),

    annualQuota: z
      .number()
      .min(0),

    rules: leaveRulesSchema,

    status: z
      .enum([
        "ACTIVE",
        "INACTIVE",
      ])
      .optional(),
  });

export const updateLeaveTypeSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Invalid leave type code"
      )
      .optional(),

    annualQuota: z
      .number()
      .min(0)
      .optional(),

    rules:
      leaveRulesSchema.optional(),

    status: z
      .enum([
        "ACTIVE",
        "INACTIVE",
      ])
      .optional(),
  });