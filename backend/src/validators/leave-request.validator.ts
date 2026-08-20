import { z } from "zod";

const dateSchema = z
  .string()
  .datetime()
  .or(z.string().date());

export const createLeaveRequestSchema =
  z.object({
    leaveTypeId: z
      .string()
      .min(1),

    fromDate: dateSchema,

    toDate: dateSchema,

    reason: z
      .string()
      .trim()
      .min(3)
      .max(1000),
  });

export const rejectLeaveRequestSchema =
  z.object({
    rejectionReason: z
      .string()
      .trim()
      .min(3)
      .max(1000),
  });