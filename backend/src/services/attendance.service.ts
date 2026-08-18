import { Types } from "mongoose";

import { AppError } from "../errors/app-error";
import { env } from "../config/env";
import { findEmployeeById } from "../repositories/employee.repository";
import {
  createAttendance,
  findAttendanceByEmployeeAndDate,
  findAttendanceInRange,
  findAttendanceRecords,
  updateAttendance,
} from "../repositories/attendance.repository";
import {
  getLocalDateString,
  getLocalMinutesSinceMidnight,
  getWorkingDaysInMonth,
} from "../utils/timezone.util";

const WEEKEND_DAYS = env.ATTENDANCE_WEEKEND_DAYS.split(",").map(Number);

const assertValidEmployee = async (employeeId: string) => {
  if (!Types.ObjectId.isValid(employeeId)) {
    throw new AppError("Invalid employee id", 400, "INVALID_EMPLOYEE_ID");
  }

  const employee = await findEmployeeById(employeeId);

  if (!employee) {
    throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
  }

  return employee;
};

export const checkInService = async (employeeId: string) => {
  const employee = await assertValidEmployee(employeeId);

  const now = new Date();
  const localDate = getLocalDateString(now, employee.timezone);

  const existing = await findAttendanceByEmployeeAndDate(
    employeeId,
    localDate
  );

  if (existing) {
    throw new AppError(
      "Employee has already checked in for today",
      409,
      "ALREADY_CHECKED_IN"
    );
  }

  const minutesSinceMidnight = getLocalMinutesSinceMidnight(
    now,
    employee.timezone
  );

  const status =
    minutesSinceMidnight > env.ATTENDANCE_LATE_CUTOFF_MINUTES
      ? "LATE"
      : "PRESENT";

  const attendance = await createAttendance({
    employeeId: employee._id,
    date: localDate,
    checkInAt: now,
    status,
    timezone: employee.timezone,
  } as any);

  return attendance;
};

export const checkOutService = async (employeeId: string) => {
  const employee = await assertValidEmployee(employeeId);

  const now = new Date();
  const localDate = getLocalDateString(now, employee.timezone);

  const record = await findAttendanceByEmployeeAndDate(
    employeeId,
    localDate
  );

  if (!record) {
    throw new AppError(
      "No check-in found for today",
      404,
      "NO_CHECKIN_FOUND"
    );
  }

  if (record.checkOutAt) {
    throw new AppError(
      "Employee has already checked out for today",
      409,
      "ALREADY_CHECKED_OUT"
    );
  }

  if (now < record.checkInAt) {
    // Defensive only — shouldn't be reachable through this flow.
    throw new AppError(
      "Check-out time cannot be before check-in time",
      400,
      "INVALID_CHECKOUT_TIME"
    );
  }

  const workedMinutes =
    (now.getTime() - record.checkInAt.getTime()) / 60000;

  // Placeholder policy: short days get downgraded to HALF_DAY regardless
  // of whether check-in was PRESENT or LATE. Revisit once HR confirms
  // the actual half-day rule.
  const status =
    workedMinutes < env.ATTENDANCE_MIN_MINUTES_FULL_DAY
      ? "HALF_DAY"
      : record.status;

  const updated = await updateAttendance(record.id, {
    checkOutAt: now,
    status,
  });

  return updated;
};

export const getAttendanceListService = async (
  page: number,
  limit: number,
  employeeId?: string,
  status?: string,
  from?: string,
  to?: string
) => {
  const filter: Record<string, unknown> = {};

  if (employeeId) filter.employeeId = employeeId;
  if (status) filter.status = status;

  if (from || to) {
    filter.date = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const skip = (page - 1) * limit;
  const result = await findAttendanceRecords(filter, skip, limit);

  return {
    ...result,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
};

export const getMonthlyAttendanceSummaryService = async (
  employeeId: string,
  year: number,
  month: number // 1-12
) => {
  await assertValidEmployee(employeeId);

  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;

  const records = await findAttendanceInRange(employeeId, fromDate, toDate);

  // Holiday exclusion intentionally not applied yet — see module notes.
  const workingDays = getWorkingDaysInMonth(year, month, WEEKEND_DAYS);

  const counts = {
    presentDays: 0,
    lateDays: 0,
    halfDays: 0,
    leaveDays: 0,
    absentDays: 0,
  };

  for (const record of records) {
    if (record.status === "PRESENT") counts.presentDays++;
    else if (record.status === "LATE") counts.lateDays++;
    else if (record.status === "HALF_DAY") counts.halfDays++;
    else if (record.status === "LEAVE") counts.leaveDays++;
  }

  const accountedDays =
    counts.presentDays + counts.lateDays + counts.halfDays + counts.leaveDays;

  counts.absentDays = Math.max(workingDays - accountedDays, 0);

  return {
    employeeId,
    year,
    month,
    workingDays,
    ...counts,
    holidaysExcluded: false, // flips to true once Holiday module is wired in
  };
};