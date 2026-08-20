import { Request, Response, NextFunction } from "express";

import {
  checkInService,
  checkOutService,
  getAttendanceListService,
  getMonthlyAttendanceSummaryService,
} from "../services/attendance.service";
import { AppError } from "../errors/app-error";
import {
  assertCanReadEmployeeRecord,
  assertCanWriteEmployeeAttendance,
  findDirectReportIds,
} from "../services/authorization.service";
import { getPagination } from "../utils/pagination.util";

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

    await assertCanWriteEmployeeAttendance(req.user, targetEmployeeId);

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

    await assertCanWriteEmployeeAttendance(req.user, targetEmployeeId);

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
    const { page, limit } = getPagination(req.query.page, req.query.limit, 10);

    let employeeId = req.query.employeeId as string | undefined;
    const status = req.query.status as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (req.user?.role === "EMPLOYEE") {
      employeeId = req.user.userId;
    } else if (req.user?.role === "MANAGER" && employeeId) {
      await assertCanReadEmployeeRecord(req.user, employeeId);
    }

    const scopedEmployeeIds =
      req.user?.role === "MANAGER"
        ? await findDirectReportIds(req.user.userId)
        : undefined;

    const result = await getAttendanceListService(
      page,
      limit,
      employeeId,
      status,
      from,
      to,
      scopedEmployeeIds
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

    await assertCanReadEmployeeRecord(req.user, targetEmployeeId);

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
