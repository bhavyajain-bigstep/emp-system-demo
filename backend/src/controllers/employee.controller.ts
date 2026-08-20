import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createEmployeeService,
  getEmployeeService,
  getEmployeesService,
  updateEmployeeService,
} from "../services/employee.service";
import { assertCanReadEmployeeRecord } from "../services/authorization.service";
import { getPagination } from "../utils/pagination.util";

export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employee = await createEmployeeService({
      ...req.body,
      actorId: req.user?.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit } = getPagination(req.query.page, req.query.limit, 10);

    const departmentId =
      req.query.departmentId as string | undefined;

    const status =
      req.query.status as string | undefined;

    const result = await getEmployeesService(
      page,
      limit,
      departmentId,
      status
    );

    return res.status(200).json({
      success: true,
      message: "Employees fetched successfully",
      data: result.employees,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const targetId = req.params.id as string;
    await assertCanReadEmployeeRecord(req.user, targetId);

    const employee = await getEmployeeService(targetId);

    return res.status(200).json({
      success: true,
      message: "Employee fetched successfully",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employee = await updateEmployeeService(
      req.params.id as string,
      req.body,
      req.user?.userId
    );

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};
