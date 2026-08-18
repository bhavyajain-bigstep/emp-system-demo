import { Request, Response, NextFunction } from "express";

import {
  archiveDepartmentService,
  createDepartmentService,
  getDepartmentService,
  getDepartmentsService,
  updateDepartmentService,
} from "../services/department.service";

export const createDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await createDepartmentService(req.body);

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const status = req.query.status as string | undefined;

    const result = await getDepartmentsService(page, limit, status);

    return res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
      data: result.departments,
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

export const getDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await getDepartmentService(
      req.params.id as string
    );

    return res.status(200).json({
      success: true,
      message: "Department fetched successfully",
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await updateDepartmentService(
      req.params.id as string,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await archiveDepartmentService(
      req.params.id as string
    );

    return res.status(200).json({
      success: true,
      message: "Department archived successfully",
      data: department,
    });
  } catch (error) {
    next(error);
  }
};