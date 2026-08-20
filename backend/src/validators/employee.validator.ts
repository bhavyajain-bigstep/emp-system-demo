import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .min(2)
    .max(20),

  name: z
    .string()
    .min(2)
    .max(100),

  email: z
    .string()
    .email(),

  password: z
    .string()
    .min(8),

  role: z
    .enum(["EMPLOYEE", "MANAGER", "HR", "ADMIN"])
    .default("EMPLOYEE"),

  managerId: z
    .string()
    .optional(),

  departmentId: z
    .string()
    .min(1),

  joiningDate: z
    .string()
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      { message: "joiningDate must be a valid date" }
    ),

  timezone: z
    .string()
    .default("Asia/Kolkata"),
});

export const updateEmployeeSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .optional(),

  role: z
    .enum(["EMPLOYEE", "MANAGER", "HR", "ADMIN"])
    .optional(),

  managerId: z
    .string()
    .optional(),

  departmentId: z
    .string()
    .optional(),

  timezone: z
    .string()
    .optional(),

  status: z
    .enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
    .optional(),
});