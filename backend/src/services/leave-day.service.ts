import { Holiday, IHoliday } from "../models/holiday.model";
import { env } from "../config/env";
import {
  getLocalDateString,
  getLocalDayOfWeek,
  isWeekendDay,
} from "../utils/timezone.util";

export interface CalculateLeaveDaysOptions {
  fromDate: Date | string;
  toDate: Date | string;
  timezone?: string;
  excludeWeekends?: boolean;
  excludeMandatoryHolidays?: boolean;
  excludeOptionalHolidays?: boolean;
  weekendDays?: number[];
}

export interface LeaveDaysCalculationResult {
  days: number;
  totalCalendarDays: number;
  weekendDays: number;
  holidayDays: number;
  workingDays: number;
}

const DEFAULT_WEEKEND_DAYS = env.ATTENDANCE_WEEKEND_DAYS
  ? env.ATTENDANCE_WEEKEND_DAYS.split(",").map(Number)
  : [0, 6];

/**
 * Reusable service for calculating working leave days.
 * Timezone-aware and queries holidays efficiently in a single query.
 */
export async function calculateLeaveDays(
  fromDate: Date | string,
  toDate: Date | string,
  excludeWeekends = true,
  excludeMandatoryHolidays = true,
  timezone = "Asia/Kolkata",
  excludeOptionalHolidays = false
): Promise<number> {
  const result = await calculateLeaveDaysDetailed({
    fromDate,
    toDate,
    timezone,
    excludeWeekends,
    excludeMandatoryHolidays,
    excludeOptionalHolidays,
    weekendDays: DEFAULT_WEEKEND_DAYS,
  });

  return result.days;
}

export async function calculateLeaveDaysDetailed(
  options: CalculateLeaveDaysOptions
): Promise<LeaveDaysCalculationResult> {
  const {
    fromDate,
    toDate,
    timezone = "Asia/Kolkata",
    excludeWeekends = true,
    excludeMandatoryHolidays = true,
    excludeOptionalHolidays = false,
    weekendDays = DEFAULT_WEEKEND_DAYS,
  } = options;

  const start = new Date(fromDate);
  const end = new Date(toDate);

  if (start > end) {
    return {
      days: 0,
      totalCalendarDays: 0,
      weekendDays: 0,
      holidayDays: 0,
      workingDays: 0,
    };
  }

  // Get local date strings (YYYY-MM-DD)
  const startStr = getLocalDateString(start, timezone);
  const endStr = getLocalDateString(end, timezone);

  // Fetch all holidays spanning the period in a single query
  const startQueryDate = new Date(start);
  startQueryDate.setHours(0, 0, 0, 0);
  startQueryDate.setDate(startQueryDate.getDate() - 1); // buffer for timezone offsets

  const endQueryDate = new Date(end);
  endQueryDate.setHours(23, 59, 59, 999);
  endQueryDate.setDate(endQueryDate.getDate() + 1);

  const holidays: IHoliday[] = await Holiday.find({
    date: {
      $gte: startQueryDate,
      $lte: endQueryDate,
    },
  });

  const mandatoryHolidayDates = new Set<string>();
  const optionalHolidayDates = new Set<string>();

  for (const h of holidays) {
    const hStr = getLocalDateString(h.date, timezone);
    if (h.optional) {
      optionalHolidayDates.add(hStr);
    } else {
      mandatoryHolidayDates.add(hStr);
    }
  }

  let totalCalendarDays = 0;
  let weekendCount = 0;
  let holidayCount = 0;
  let leaveDays = 0;

  const [startYear, startMonth, startDay] = startStr.split("-").map(Number);
  const [endYear, endMonth, endDay] = endStr.split("-").map(Number);

  const curr = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const finish = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  while (curr <= finish) {
    totalCalendarDays++;
    const y = curr.getUTCFullYear();
    const m = String(curr.getUTCMonth() + 1).padStart(2, "0");
    const d = String(curr.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const isWeekend = isWeekendDay(dateStr, weekendDays);
    const isMandatoryHoliday = mandatoryHolidayDates.has(dateStr);
    const isOptionalHoliday = optionalHolidayDates.has(dateStr);

    if (excludeWeekends && isWeekend) {
      weekendCount++;
      curr.setUTCDate(curr.getUTCDate() + 1);
      continue;
    }

    if (excludeMandatoryHolidays && isMandatoryHoliday) {
      holidayCount++;
      curr.setUTCDate(curr.getUTCDate() + 1);
      continue;
    }

    if (excludeOptionalHolidays && isOptionalHoliday) {
      holidayCount++;
      curr.setUTCDate(curr.getUTCDate() + 1);
      continue;
    }

    leaveDays++;
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return {
    days: leaveDays,
    totalCalendarDays,
    weekendDays: weekendCount,
    holidayDays: holidayCount,
    workingDays: leaveDays,
  };
}