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

export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employee = await createEmployeeService(
      req.body
    );

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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

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
    const employee = await getEmployeeService(
      req.params.id as string
    );

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
      req.body
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