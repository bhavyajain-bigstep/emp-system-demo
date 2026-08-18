import {
  createDepartment,
  findDepartmentById,
  findDepartmentByName,
  findDepartments,
  updateDepartment,
} from "../repositories/department.repository";

import {
  findEmployeeById,
  countActiveEmployeesInDepartment,
} from "../repositories/employee.repository";

import { AppError } from "../errors/app-error";

interface CreateDepartmentInput {
  name: string;
  managerId?: string;
}

interface UpdateDepartmentInput {
  name?: string;
  managerId?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

const MANAGER_ELIGIBLE_ROLES = ["MANAGER", "HR", "ADMIN"];

const assertValidManager = async (managerId: string) => {
  const manager = await findEmployeeById(managerId);

  if (!manager) {
    throw new AppError(
      "Manager not found",
      404,
      "MANAGER_NOT_FOUND"
    );
  }

  if (!MANAGER_ELIGIBLE_ROLES.includes(manager.role)) {
    throw new AppError(
      "Assigned manager must have role MANAGER, HR, or ADMIN",
      400,
      "INVALID_MANAGER_ROLE"
    );
  }
};

export const createDepartmentService = async (
  data: CreateDepartmentInput
) => {
  const existing = await findDepartmentByName(data.name);

  if (existing) {
    throw new AppError(
      "Department name already exists",
      409,
      "DEPARTMENT_NAME_ALREADY_EXISTS"
    );
  }

  if (data.managerId) {
    await assertValidManager(data.managerId);
  }

  const department = await createDepartment({
    name: data.name,
    managerId: data.managerId as any,
  });

  return department;
};

export const getDepartmentService = async (id: string) => {
  const department = await findDepartmentById(id);

  if (!department) {
    throw new AppError(
      "Department not found",
      404,
      "DEPARTMENT_NOT_FOUND"
    );
  }

  return department;
};

export const getDepartmentsService = async (
  page: number,
  limit: number,
  status?: string
) => {
  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const result = await findDepartments(filter, skip, limit);

  return {
    ...result,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
};

export const updateDepartmentService = async (
  id: string,
  data: UpdateDepartmentInput
) => {
  const department = await findDepartmentById(id);

  if (!department) {
    throw new AppError(
      "Department not found",
      404,
      "DEPARTMENT_NOT_FOUND"
    );
  }

  if (data.name && data.name !== department.name) {
    const existing = await findDepartmentByName(data.name);

    if (existing) {
      throw new AppError(
        "Department name already exists",
        409,
        "DEPARTMENT_NAME_ALREADY_EXISTS"
      );
    }
  }

  if (data.managerId) {
    await assertValidManager(data.managerId);
  }

  // Reactivating an archived department is allowed via status: "ACTIVE".
  // Archiving is also allowed here directly, but the guarded path is
  // the dedicated archiveDepartmentService below (checks active employees).
  const updatedDepartment = await updateDepartment(id, data as any);

  return updatedDepartment;
};

export const archiveDepartmentService = async (id: string) => {
  const department = await findDepartmentById(id);

  if (!department) {
    throw new AppError(
      "Department not found",
      404,
      "DEPARTMENT_NOT_FOUND"
    );
  }

  if (department.status === "ARCHIVED") {
    return department;
  }

  const activeEmployeeCount = await countActiveEmployeesInDepartment(
    id
  );

  if (activeEmployeeCount > 0) {
    throw new AppError(
      "Cannot archive a department with active employees assigned to it",
      409,
      "DEPARTMENT_HAS_ACTIVE_EMPLOYEES"
    );
  }

  const archivedDepartment = await updateDepartment(id, {
    status: "ARCHIVED",
  } as any);

  return archivedDepartment;
};