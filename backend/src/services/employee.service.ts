import {
  hash
} from "bcrypt";
import { Types } from "mongoose";

import {
  createEmployee,
  findEmployeeByCode,
  findEmployeeByEmail,
  findEmployeeById,
  findEmployees,
  updateEmployee,
} from "../repositories/employee.repository";
import { findDepartmentById } from "../repositories/department.repository";
import { Employee } from "../models/employee.model";

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

  /*
   * Validate department exists.
   */
  if (data.departmentId === undefined) {
    throw new AppError(
      "Department ID is required",
      400,
      "DEPARTMENT_REQUIRED"
    );
  }

  if (!Types.ObjectId.isValid(data.departmentId)) {
    throw new AppError(
      "Invalid department ID",
      400,
      "INVALID_DEPARTMENT_ID"
    );
  }

  const department = await findDepartmentById(data.departmentId);

  if (!department) {
    throw new AppError(
      "Department not found",
      404,
      "DEPARTMENT_NOT_FOUND"
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
    departmentId: department._id,
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

    const manager = await findEmployeeById(data.managerId);

    if (!manager) {
      throw new AppError(
        "Manager not found",
        404,
        "MANAGER_NOT_FOUND"
      );
    }

    if (
      manager.role !== "MANAGER" &&
      manager.role !== "HR" &&
      manager.role !== "ADMIN"
    ) {
      throw new AppError(
        "Manager must be a MANAGER, HR or ADMIN",
        400,
        "INVALID_MANAGER_ROLE"
      );
    }

    employeeData.managerId =
      new Types.ObjectId(
        data.managerId
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

  // Re-fetch so the response is consistent with other endpoints
  // (excludes the hidden passwordHash field and populates refs).
  const created = await findEmployeeById(employee._id.toString());

  return created ?? employee;
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

    if (data.managerId === id) {
      throw new AppError(
        "An employee cannot be their own manager",
        400,
        "SELF_MANAGER"
      );
    }

    const manager = await findEmployeeById(data.managerId);

    if (!manager) {
      throw new AppError(
        "Manager not found",
        404,
        "MANAGER_NOT_FOUND"
      );
    }

    if (
      manager.role !== "MANAGER" &&
      manager.role !== "HR" &&
      manager.role !== "ADMIN"
    ) {
      throw new AppError(
        "Manager must be a MANAGER, HR or ADMIN",
        400,
        "INVALID_MANAGER_ROLE"
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

    const department = await findDepartmentById(data.departmentId);

    if (!department) {
      throw new AppError(
        "Department not found",
        404,
        "DEPARTMENT_NOT_FOUND"
      );
    }

    updateData.departmentId =
      new Types.ObjectId(
        data.departmentId
      );
  }

  /*
   * Lockout safeguard: never allow deactivating the last active ADMIN.
   */
  if (
    data.status !== undefined &&
    data.status !== "ACTIVE" &&
    employee.role === "ADMIN" &&
    employee.status === "ACTIVE"
  ) {
    const otherActiveAdmins = await Employee.countDocuments({
      role: "ADMIN",
      status: "ACTIVE",
      _id: { $ne: employee._id },
    });

    if (otherActiveAdmins === 0) {
      throw new AppError(
        "Cannot deactivate the last active admin. Promote another admin first.",
        400,
        "LAST_ACTIVE_ADMIN"
      );
    }
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