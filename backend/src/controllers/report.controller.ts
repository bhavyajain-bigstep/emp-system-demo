import { Request, Response, NextFunction } from "express";
import {
  getAttendanceReportService,
  exportAttendanceReportCsv,
  getLeaveReportService,
  exportLeaveReportCsv,
} from "../services/report.service";

export const getAttendanceReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

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

    const csvData = await exportAttendanceReportCsv(filter, auth);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-report-${timestamp}.csv"`
    );

    return res.status(200).send(csvData);
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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

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

    const csvData = await exportLeaveReportCsv(filter, auth);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leave-report-${timestamp}.csv"`
    );

    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};
