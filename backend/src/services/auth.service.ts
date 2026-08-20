import { compare } from "bcrypt";

import { findEmployeeByEmail } from "../repositories/employee.repository";
import { AppError } from "../errors/app-error";
import { generateAccessToken } from "../utils/jwt";

export const loginService = async (
  email: string,
  password: string
) => {
  const employee = await findEmployeeByEmail(email);

  if (!employee) {
    throw new AppError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (employee.status !== "ACTIVE") {
    throw new AppError(
      "Employee account is not active",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  const passwordMatches = await compare(
    password,
    employee.passwordHash
  );

  if (!passwordMatches) {
    throw new AppError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const accessToken = generateAccessToken({
    userId: employee._id.toString(),
    employeeCode: employee.employeeCode,
    role: employee.role,
    departmentId: employee.departmentId ? employee.departmentId.toString() : undefined,
    managerId: employee.managerId ? employee.managerId.toString() : undefined,
  });

  return {
    accessToken,
    user: {
      id: employee._id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      departmentId: employee.departmentId,
      managerId: employee.managerId,
    },
  };
};