import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createDepartmentService,
  deleteDepartmentService,
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
    const department =
      await createDepartmentService(
        req.body.name,
        req.body.managerId
      );

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
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const departments =
      await getDepartmentsService();

    return res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartment = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const department =
      await getDepartmentService(
        req.params.id
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
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const department =
      await updateDepartmentService(
        req.params.id,
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

export const deleteDepartment = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteDepartmentService(
      req.params.id
    );

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};