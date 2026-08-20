import { z } from "zod";

const dateSchema = z
  .string()
  .datetime()
  .or(z.string().date());

export const createHolidaySchema =
  z.object({
    date: dateSchema,

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
    date: dateSchema.optional(),

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