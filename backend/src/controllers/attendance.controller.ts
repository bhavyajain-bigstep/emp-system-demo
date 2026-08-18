import { Request, Response, NextFunction } from "express";

import {
  checkInService,
  checkOutService,
  getAttendanceListService,
  getMonthlyAttendanceSummaryService,
} from "../services/attendance.service";

export const checkIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const attendance = await checkInService(
      req.params.employeeId as string
    );

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
    const attendance = await checkOutService(
      req.params.employeeId as string
    );

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

    const employeeId = req.query.employeeId as string | undefined;
    const status = req.query.status as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

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
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const summary = await getMonthlyAttendanceSummaryService(
      req.params.employeeId as string,
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