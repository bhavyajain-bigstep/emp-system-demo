import { compare, hash } from "bcrypt";

import {
  findEmployeeByEmail,
  updateRefreshTokenHash,
} from "../repositories/employee.repository";
import { AppError } from "../errors/app-error";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { env } from "../config/env";

export const loginService = async (email: string, password: string) => {
  const employee = await findEmployeeByEmail(email);

  if (!employee) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (employee.status !== "ACTIVE") {
    throw new AppError("Employee account is not active", 403, "ACCOUNT_INACTIVE");
  }

  const passwordMatches = await compare(password, employee.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const accessToken = generateAccessToken({
    userId: employee._id.toString(),
    employeeCode: employee.employeeCode,
    role: employee.role,
    departmentId: employee.departmentId ? employee.departmentId.toString() : undefined,
    managerId: employee.managerId ? employee.managerId.toString() : undefined,
  });

  const refreshToken = generateRefreshToken({
    userId: employee._id.toString(),
  });

  const refreshTokenHash = await hash(refreshToken, 12);
  await updateRefreshTokenHash(employee._id.toString(), refreshTokenHash);

  return {
    accessToken,
    refreshToken,
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

export const refreshAccessTokenService = async (refreshToken: string) => {
  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const employee = await findEmployeeById(payload.userId);
  if (!employee || !employee.refreshTokenHash) {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const matches = await compare(refreshToken, employee.refreshTokenHash);
  if (!matches) {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  if (employee.status !== "ACTIVE") {
    throw new AppError("Employee account is not active", 403, "ACCOUNT_INACTIVE");
  }

  // rotate tokens
  const newAccessToken = generateAccessToken({
    userId: employee._id.toString(),
    employeeCode: employee.employeeCode,
    role: employee.role,
    departmentId: employee.departmentId ? employee.departmentId.toString() : undefined,
    managerId: employee.managerId ? employee.managerId.toString() : undefined,
  });

  const newRefreshToken = generateRefreshToken({ userId: employee._id.toString() });
  const newRefreshTokenHash = await hash(newRefreshToken, 12);
  await updateRefreshTokenHash(employee._id.toString(), newRefreshTokenHash);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
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

export const logoutService = async (userId: string) => {
  await updateRefreshTokenHash(userId, null);
};

// Need to import findEmployeeById
import { findEmployeeById } from "../repositories/employee.repository";