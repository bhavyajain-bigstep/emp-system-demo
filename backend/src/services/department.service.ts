import { Types } from "mongoose";

import { AppError } from "../errors/app-error";

import {
  createDepartment,
  deleteDepartment,
  findDepartmentById,
  findDepartmentByName,
  findDepartments,
  updateDepartment,
} from "../repositories/department.repository";
import { countActiveEmployeesInDepartment } from "../repositories/employee.repository";

export const createDepartmentService = async (
  name: string,
  managerId?: string
) => {
  const existingDepartment =
    await findDepartmentByName(name);

  if (existingDepartment) {
    throw new AppError(
      "Department already exists",
      409,
      "DEPARTMENT_ALREADY_EXISTS"
    );
  }

  const departmentData: {
    name: string;
    managerId?: Types.ObjectId;
  } = {
    name,
  };

  if (managerId !== undefined) {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new AppError(
        "Invalid manager ID",
        400,
        "INVALID_MANAGER_ID"
      );
    }

    departmentData.managerId =
      new Types.ObjectId(managerId);
  }

  return createDepartment(departmentData);
};

export const getDepartmentsService = async () => {
  return findDepartments();
};

export const getDepartmentService = async (
  id: string
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(
      "Invalid department ID",
      400,
      "INVALID_DEPARTMENT_ID"
    );
  }

  const department =
    await findDepartmentById(id);

  if (!department) {
    throw new AppError(
      "Department not found",
      404,
      "DEPARTMENT_NOT_FOUND"
    );
  }

  return department;
};

export const updateDepartmentService = async (
  id: string,
  data: {
    name?: string;
    managerId?: string;
  }
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(
      "Invalid department ID",
      400,
      "INVALID_DEPARTMENT_ID"
    );
  }

  const department =
    await findDepartmentById(id);

  if (!department) {
    throw new AppError(
      "Department not found",
      404,
      "DEPARTMENT_NOT_FOUND"
    );
  }

  if (data.name !== undefined) {
    const existingDepartment =
      await findDepartmentByName(data.name);

    if (
      existingDepartment &&
      existingDepartment._id.toString() !== id
    ) {
      throw new AppError(
        "Department name already exists",
        409,
        "DEPARTMENT_ALREADY_EXISTS"
      );
    }
  }

  const updateData: {
    name?: string;
    managerId?: Types.ObjectId;
  } = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.managerId !== undefined) {
    if (!Types.ObjectId.isValid(data.managerId)) {
      throw new AppError(
        "Invalid manager ID",
        400,
        "INVALID_MANAGER_ID"
      );
    }

    updateData.managerId =
      new Types.ObjectId(data.managerId);
  }

  return updateDepartment(
    id,
    updateData
  );
};

export const deleteDepartmentService = async (
  id: string
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(
      "Invalid department ID",
      400,
      "INVALID_DEPARTMENT_ID"
    );
  }

  const department =
    await findDepartmentById(id);

  if (!department) {
    throw new AppError(
      "Department not found",
      404,
      "DEPARTMENT_NOT_FOUND"
    );
  }

  const activeEmployees = await countActiveEmployeesInDepartment(id);
  if (activeEmployees > 0) {
    throw new AppError(
      "Department cannot be deleted while it has active employees",
      409,
      "DEPARTMENT_HAS_ACTIVE_EMPLOYEES"
    );
  }

  return deleteDepartment(id);
};
