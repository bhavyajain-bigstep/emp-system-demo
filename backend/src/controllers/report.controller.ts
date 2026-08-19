import { Request, Response, NextFunction } from "express";
import {
  getAttendanceReportService,
  streamAttendanceReportCsv,
  getLeaveReportService,
  streamLeaveReportCsv,
} from "../services/report.service";
import { getPagination } from "../utils/pagination.util";

export const getAttendanceReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit } = getPagination(req.query.page, req.query.limit, 20);

    const filter = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      employeeId: req.query.employeeId as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      status: req.query.status as string | undefined,
    };

    const auth = req.user
      ? { userId: req.user.userId, role: req.user.role }
      : undefined;

    const result = await getAttendanceReportService(filter, page, limit, auth);

    return res.status(200).json({
      success: true,
      message: "Attendance report fetched successfully",
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

export const exportAttendanceReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filter = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      employeeId: req.query.employeeId as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      status: req.query.status as string | undefined,
    };

    const auth = req.user
      ? { userId: req.user.userId, role: req.user.role }
      : undefined;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-report-${timestamp}.csv"`
    );

    const stream = streamAttendanceReportCsv(filter, auth);
    stream.on("error", next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const getLeaveReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit } = getPagination(req.query.page, req.query.limit, 20);

    const filter = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      employeeId: req.query.employeeId as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      leaveTypeId: req.query.leaveTypeId as string | undefined,
      status: req.query.status as string | undefined,
    };

    const auth = req.user
      ? { userId: req.user.userId, role: req.user.role }
      : undefined;

    const result = await getLeaveReportService(filter, page, limit, auth);

    return res.status(200).json({
      success: true,
      message: "Leave report fetched successfully",
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

export const exportLeaveReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filter = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      employeeId: req.query.employeeId as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      leaveTypeId: req.query.leaveTypeId as string | undefined,
      status: req.query.status as string | undefined,
    };

    const auth = req.user
      ? { userId: req.user.userId, role: req.user.role }
      : undefined;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leave-report-${timestamp}.csv"`
    );

    const stream = streamLeaveReportCsv(filter, auth);
    stream.on("error", next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};
