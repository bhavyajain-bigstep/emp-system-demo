import bcrypt from 'bcrypt-ts';

import {
  createEmployee,
  findEmployeeByCode,
  findEmployeeByEmail,
  findEmployeeById,
  findEmployees,
  updateEmployee,
} from "../repositories/employee.repository";

import { AppError } from "../errors/app-error";

interface CreateEmployeeInput {
  employeeCode: string;
  name: string;
  email: string;
  password: string;
  role: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
  managerId?: string;
  departmentId?: string;
  joiningDate: string;
  timezone: string;
}

export const createEmployeeService = async (
  data: CreateEmployeeInput
) => {
  const existingEmail = await findEmployeeByEmail(data.email);

  if (existingEmail) {
    throw new AppError(
      "Email already exists",
      409,
      "EMAIL_ALREADY_EXISTS"
    );
  }

  const existingCode = await findEmployeeByCode(
    data.employeeCode
  );

  if (existingCode) {
    throw new AppError(
      "Employee code already exists",
      409,
      "EMPLOYEE_CODE_ALREADY_EXISTS"
    );
  }

  if (data.managerId === undefined && data.role === "EMPLOYEE") {
    // Manager can be optional depending on your final business rules.
  }

  const passwordHash = await bcrypt.hash(
    data.password,
    12
  );

  const employee = await createEmployee({
    employeeCode: data.employeeCode,
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    managerId: data.managerId as any,
    departmentId: data.departmentId as any,
    joiningDate: new Date(data.joiningDate),
    timezone: data.timezone,
  });

  return employee;
};

export const getEmployeeService = async (
  id: string
) => {
  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new AppError(
      "Employee not found",
      404,
      "EMPLOYEE_NOT_FOUND"
    );
  }

  return employee;
};

export const getEmployeesService = async (
  page: number,
  limit: number,
  departmentId?: string,
  status?: string
) => {
  const filter: Record<string, unknown> = {};

  if (departmentId) {
    filter.departmentId = departmentId;
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const result = await findEmployees(
    filter,
    skip,
    limit
  );

  return {
    ...result,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
};

export const updateEmployeeService = async (
  id: string,
  data: any
) => {
  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new AppError(
      "Employee not found",
      404,
      "EMPLOYEE_NOT_FOUND"
    );
  }

  const updatedEmployee = await updateEmployee(
    id,
    data
  );

  return updatedEmployee;
};