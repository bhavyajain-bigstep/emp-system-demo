import { z } from "zod";

export const createHolidaySchema =
  z.object({
    date: z
      .string()
      .datetime(),

    name: z
      .string()
      .trim()
      .min(2)
      .max(200),

    optional: z
      .boolean()
      .default(false),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),
  });

export const updateHolidaySchema =
  z.object({
    date: z
      .string()
      .datetime()
      .optional(),

    name: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .optional(),

    optional: z
      .boolean()
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),
  });