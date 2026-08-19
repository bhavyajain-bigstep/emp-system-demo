import {
  hash
} from "bcrypt-ts";
import { Types } from "mongoose";

import {
  createEmployee,
  findEmployeeByCode,
  findEmployeeByEmail,
  findEmployeeById,
  findEmployees,
  updateEmployee,
} from "../repositories/employee.repository";

import { AppError } from "../errors/app-error";
import { logAuditEvent } from "./audit-log.service";

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
  actorId?: string;
}

interface CreateEmployeeData {
  employeeCode: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
  managerId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  joiningDate: Date;
  timezone: string;
}

export const createEmployeeService = async (
  data: CreateEmployeeInput
) => {
  const existingEmail =
    await findEmployeeByEmail(data.email);

  if (existingEmail) {
    throw new AppError(
      "Email already exists",
      409,
      "EMAIL_ALREADY_EXISTS"
    );
  }

  const existingCode =
    await findEmployeeByCode(
      data.employeeCode
    );

  if (existingCode) {
    throw new AppError(
      "Employee code already exists",
      409,
      "EMPLOYEE_CODE_ALREADY_EXISTS"
    );
  }

  const passwordHash =
    await hash(
      data.password,
      12
    );

  const employeeData: CreateEmployeeData = {
    employeeCode: data.employeeCode,
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    joiningDate: new Date(
      data.joiningDate
    ),
    timezone: data.timezone,
  };

  /*
   * Convert managerId string
   * to MongoDB ObjectId.
   */
  if (data.managerId !== undefined) {
    if (
      !Types.ObjectId.isValid(
        data.managerId
      )
    ) {
      throw new AppError(
        "Invalid manager ID",
        400,
        "INVALID_MANAGER_ID"
      );
    }

    employeeData.managerId =
      new Types.ObjectId(
        data.managerId
      );
  }

  /*
   * Convert departmentId string
   * to MongoDB ObjectId.
   */
  if (data.departmentId !== undefined) {
    if (
      !Types.ObjectId.isValid(
        data.departmentId
      )
    ) {
      throw new AppError(
        "Invalid department ID",
        400,
        "INVALID_DEPARTMENT_ID"
      );
    }

    employeeData.departmentId =
      new Types.ObjectId(
        data.departmentId
      );
  }

  const employee =
    await createEmployee(
      employeeData
    );

  await logAuditEvent({
    actorId: data.actorId,
    action: "EMPLOYEE_CREATED",
    entityType: "EMPLOYEE",
    entityId: employee._id.toString(),
    newValue: employee,
    metadata: {
      employeeCode: employee.employeeCode,
      email: employee.email,
      role: employee.role,
    },
  });

  return employee;
};

export const getEmployeeService = async (
  id: string
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(
      "Invalid employee ID",
      400,
      "INVALID_EMPLOYEE_ID"
    );
  }

  const employee =
    await findEmployeeById(id);

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
  const filter: Record<
    string,
    unknown
  > = {};

  if (
    departmentId !== undefined
  ) {
    if (
      !Types.ObjectId.isValid(
        departmentId
      )
    ) {
      throw new AppError(
        "Invalid department ID",
        400,
        "INVALID_DEPARTMENT_ID"
      );
    }

    filter.departmentId =
      new Types.ObjectId(
        departmentId
      );
  }

  if (status) {
    filter.status = status;
  }

  const skip =
    (page - 1) * limit;

  const result =
    await findEmployees(
      filter,
      skip,
      limit
    );

  return {
    ...result,
    page,
    limit,
    totalPages:
      Math.ceil(
        result.total / limit
      ),
  };
};

export const updateEmployeeService = async (
  id: string,
  data: {
    name?: string;
    role?:
      | "EMPLOYEE"
      | "MANAGER"
      | "HR"
      | "ADMIN";
    managerId?: string;
    departmentId?: string;
    timezone?: string;
    status?:
      | "ACTIVE"
      | "INACTIVE"
      | "SUSPENDED";
  },
  actorId?: string
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(
      "Invalid employee ID",
      400,
      "INVALID_EMPLOYEE_ID"
    );
  }

  const employee =
    await findEmployeeById(id);

  if (!employee) {
    throw new AppError(
      "Employee not found",
      404,
      "EMPLOYEE_NOT_FOUND"
    );
  }

  const updateData: {
    name?: string;
    role?:
      | "EMPLOYEE"
      | "MANAGER"
      | "HR"
      | "ADMIN";
    managerId?: Types.ObjectId;
    departmentId?: Types.ObjectId;
    timezone?: string;
    status?:
      | "ACTIVE"
      | "INACTIVE"
      | "SUSPENDED";
  } = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  if (
    data.timezone !== undefined
  ) {
    updateData.timezone =
      data.timezone;
  }

  if (data.status !== undefined) {
    updateData.status =
      data.status;
  }

  /*
   * Convert managerId.
   */
  if (data.managerId !== undefined) {
    if (
      !Types.ObjectId.isValid(
        data.managerId
      )
    ) {
      throw new AppError(
        "Invalid manager ID",
        400,
        "INVALID_MANAGER_ID"
      );
    }

    updateData.managerId =
      new Types.ObjectId(
        data.managerId
      );
  }

  /*
   * Convert departmentId.
   */
  if (
    data.departmentId !== undefined
  ) {
    if (
      !Types.ObjectId.isValid(
        data.departmentId
      )
    ) {
      throw new AppError(
        "Invalid department ID",
        400,
        "INVALID_DEPARTMENT_ID"
      );
    }

    updateData.departmentId =
      new Types.ObjectId(
        data.departmentId
      );
  }

  const updated = await updateEmployee(
    id,
    updateData
  );

  const action =
    data.status && data.status !== employee.status
      ? "EMPLOYEE_STATUS_CHANGED"
      : "EMPLOYEE_UPDATED";

  await logAuditEvent({
    actorId,
    action,
    entityType: "EMPLOYEE",
    entityId: id,
    oldValue: employee,
    newValue: updated,
  });

  return updated;
};