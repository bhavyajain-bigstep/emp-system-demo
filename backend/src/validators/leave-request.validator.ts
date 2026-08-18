import { z } from "zod";

export const createLeaveRequestSchema =
  z.object({
    leaveTypeId: z
      .string()
      .min(1),

    fromDate: z
      .string()
      .datetime(),

    toDate: z
      .string()
      .datetime(),

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