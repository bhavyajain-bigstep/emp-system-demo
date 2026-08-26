import { Types } from "mongoose";

import { AppError } from "../errors/app-error";
import { env } from "../config/env";
import { findEmployeeById } from "../repositories/employee.repository";
import { Holiday } from "../models/holiday.model";
import { LeaveRequest } from "../models/leave-request.model";
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
  isWeekendDay,
} from "../utils/timezone.util";

const WEEKEND_DAYS = env.ATTENDANCE_WEEKEND_DAYS
  ? env.ATTENDANCE_WEEKEND_DAYS.split(",").map(Number)
  : [0, 6];

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

const isWorkingDay = async (
  dateStr: string,
  timezone: string,
): Promise<{ isWorking: boolean; reason?: string }> => {
  const dayOfWeek = new Date(
    Date.UTC(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10)),
    ),
  ).getUTCDay();

  if (WEEKEND_DAYS.includes(dayOfWeek)) {
    return { isWorking: false, reason: "weekend" };
  }

  const holiday = await Holiday.findOne({
    date: new Date(`${dateStr}T00:00:00.000Z`),
    optional: false,
  });

  if (holiday) {
    return { isWorking: false, reason: "holiday" };
  }

  return { isWorking: true };
};

export const checkInService = async (employeeId: string) => {
  const employee = await assertValidEmployee(employeeId);

  const now = new Date();
  const localDate = getLocalDateString(now, employee.timezone);

  const workingDayCheck = await isWorkingDay(localDate, employee.timezone);
  if (!workingDayCheck.isWorking) {
    throw new AppError(
      `Cannot check in on a ${workingDayCheck.reason}`,
      400,
      "NOT_A_WORKING_DAY",
    );
  }

  const existing = await findAttendanceByEmployeeAndDate(employeeId, localDate);

  if (existing) {
    throw new AppError(
      "Employee has already checked in for today",
      409,
      "ALREADY_CHECKED_IN",
    );
  }

  const minutesSinceMidnight = getLocalMinutesSinceMidnight(
    now,
    employee.timezone,
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

  const record = await findAttendanceByEmployeeAndDate(employeeId, localDate);

  if (!record) {
    throw new AppError("No check-in found for today", 404, "NO_CHECKIN_FOUND");
  }

  if (record.checkOutAt) {
    throw new AppError(
      "Employee has already checked out for today",
      409,
      "ALREADY_CHECKED_OUT",
    );
  }

  if (now < record.checkInAt) {
    throw new AppError(
      "Check-out time cannot be before check-in time",
      400,
      "INVALID_CHECKOUT_TIME",
    );
  }

  const workedMinutes = (now.getTime() - record.checkInAt.getTime()) / 60000;

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
  to?: string,
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
  month: number, // 1-12
) => {
  const employee = await assertValidEmployee(employeeId);

  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay,
  ).padStart(2, "0")}`;

  const records = await findAttendanceInRange(employeeId, fromDate, toDate);

  // Fetch mandatory holidays in this month
  const startQueryDate = new Date(Date.UTC(year, month - 1, 1));
  const endQueryDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const holidays = await Holiday.find({
    date: { $gte: startQueryDate, $lte: endQueryDate },
    optional: false,
  });

  const holidayDateStrings = holidays.map((h) =>
    getLocalDateString(h.date, employee.timezone),
  );

  // Fetch approved leaves for this month
  const approvedLeaves = await LeaveRequest.find({
    employeeId: employee._id,
    status: "APPROVED",
    fromDate: { $lte: endQueryDate },
    toDate: { $gte: startQueryDate },
  }).select("fromDate toDate");

  // Build a set of dates the employee is on leave
  const leaveDates = new Set<string>();
  for (const leave of approvedLeaves) {
    const from = getLocalDateString(
      new Date(leave.fromDate),
      employee.timezone,
    );
    const to = getLocalDateString(new Date(leave.toDate), employee.timezone);
    let current = from;
    while (current <= to) {
      leaveDates.add(current);
      const date = new Date(`${current}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + 1);
      current = getLocalDateString(date, "UTC");
    }
  }

  let weekends = 0;
  let holidayCount = 0;
  let leaveCount = 0;
  let totalWorkingDays = 0;

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;

    const isWeekend = isWeekendDay(dateStr, WEEKEND_DAYS);
    const isHoliday = holidayDateStrings.includes(dateStr);
    const isOnLeave = leaveDates.has(dateStr);

    if (isWeekend) {
      weekends++;
    } else if (isHoliday) {
      holidayCount++;
    } else if (isOnLeave) {
      leaveCount++;
    } else {
      totalWorkingDays++;
    }
  }

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

  // Leave days from attendance records should match the leave dates
  // But we also count leave days from approved leaves that don't have attendance records
  const accountedDays =
    counts.presentDays + counts.lateDays + counts.halfDays + counts.leaveDays;

  counts.absentDays = Math.max(totalWorkingDays - accountedDays, 0);

  const effectivePresentDays =
    counts.presentDays + counts.lateDays + counts.halfDays * 0.5;

  const attendancePercentage =
    totalWorkingDays > 0
      ? Number(((effectivePresentDays / totalWorkingDays) * 100).toFixed(2))
      : 0;

  return {
    employeeId,
    year,
    month,
    totalWorkingDays,
    workingDays: totalWorkingDays,
    presentDays: counts.presentDays,
    lateDays: counts.lateDays,
    halfDays: counts.halfDays,
    leaveDays: counts.leaveDays + leaveCount,
    absentDays: counts.absentDays,
    holidays: holidayCount,
    weekends,
    attendancePercentage,
    holidaysExcluded: true,
  };
};
