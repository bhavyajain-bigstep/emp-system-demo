import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),

  managerId: z.string().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),

  managerId: z.string().optional(),

  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});