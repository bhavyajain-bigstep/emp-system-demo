import { Request, Response, NextFunction } from "express";

import {
  checkInService,
  checkOutService,
  getAttendanceListService,
  getMonthlyAttendanceSummaryService,
} from "../services/attendance.service";
import { AppError } from "../errors/app-error";
import { Employee } from "../models/employee.model";

export const checkIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const targetEmployeeId = (req.params.employeeId || req.user?.userId) as string;

    if (!targetEmployeeId) {
      throw new AppError("Employee ID is required", 400, "INVALID_EMPLOYEE_ID");
    }

    if (
      req.user?.role === "EMPLOYEE" &&
      req.user?.userId !== targetEmployeeId
    ) {
      throw new AppError(
        "You cannot check in for another employee",
        403,
        "FORBIDDEN"
      );
    }

    const attendance = await checkInService(targetEmployeeId);

    return res.status(201).json({
      success: true,
      message: "Checked in successfully",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const targetEmployeeId = (req.params.employeeId || req.user?.userId) as string;

    if (!targetEmployeeId) {
      throw new AppError("Employee ID is required", 400, "INVALID_EMPLOYEE_ID");
    }

    if (
      req.user?.role === "EMPLOYEE" &&
      req.user?.userId !== targetEmployeeId
    ) {
      throw new AppError(
        "You cannot check out for another employee",
        403,
        "FORBIDDEN"
      );
    }

    const attendance = await checkOutService(targetEmployeeId);

    return res.status(200).json({
      success: true,
      message: "Checked out successfully",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    let employeeId = req.query.employeeId as string | undefined;
    const status = req.query.status as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (req.user?.role === "EMPLOYEE") {
      employeeId = req.user.userId;
    }

    const result = await getAttendanceListService(
      page,
      limit,
      employeeId,
      status,
      from,
      to
    );

    return res.status(200).json({
      success: true,
      message: "Attendance records fetched successfully",
      data: result.records,
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

export const getMonthlySummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const targetEmployeeId = (
      req.params.employeeId ||
      req.query.employeeId ||
      req.user?.userId
    ) as string;

    if (!targetEmployeeId) {
      throw new AppError("Employee ID is required", 400, "INVALID_EMPLOYEE_ID");
    }

    if (
      req.user?.role === "EMPLOYEE" &&
      req.user?.userId !== targetEmployeeId
    ) {
      throw new AppError(
        "You cannot view another employee's attendance summary",
        403,
        "FORBIDDEN"
      );
    }

    if (req.user?.role === "MANAGER" && req.user?.userId !== targetEmployeeId) {
      const targetEmp = await Employee.findById(targetEmployeeId);
      if (targetEmp?.managerId?.toString() !== req.user.userId) {
        throw new AppError(
          "You can only view attendance summary for your team members",
          403,
          "FORBIDDEN"
        );
      }
    }

    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const summary = await getMonthlyAttendanceSummaryService(
      targetEmployeeId,
      year,
      month
    );

    return res.status(200).json({
      success: true,
      message: "Monthly attendance summary fetched successfully",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};