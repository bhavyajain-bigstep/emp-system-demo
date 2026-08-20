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
import { AppError } from "../errors/app-error";

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
    const targetId = req.params.id as string;
    const employee = await getEmployeeService(targetId);

    if (req.user?.role === "EMPLOYEE" && req.user.userId !== targetId) {
      throw new AppError("You do not have permission to view this employee", 403, "FORBIDDEN");
    }

    if (
      req.user?.role === "MANAGER" &&
      req.user.userId !== targetId
    ) {
      const managerId = (employee.managerId as any)?._id
        ? (employee.managerId as any)._id.toString()
        : employee.managerId?.toString();

      if (managerId !== req.user.userId) {
        throw new AppError("You can only view members of your team", 403, "FORBIDDEN");
      }
    }

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