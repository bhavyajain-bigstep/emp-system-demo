// src/utils/leave-date.util.ts

/**
 * Returns true when the date falls on Saturday or Sunday.
 *
 * JavaScript:
 * 0 = Sunday
 * 6 = Saturday
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getUTCDay();

  return day === 0 || day === 6;
};

/**
 * Returns a new Date representing the next calendar day.
 */
export const addOneDay = (date: Date): Date => {
  const nextDate = new Date(date);

  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return nextDate;
};

/**
 * Removes the time portion from a date.
 *
 * Example:
 *
 * 2026-08-19T15:32:10
 *
 * becomes:

 * 2026-08-19T00:00:00
 */
export const startOfDayUTC = (date: Date): Date => {
  const result = new Date(date);

  result.setUTCHours(0, 0, 0, 0);

  return result;
};

/**
 * Validates that fromDate is not after toDate.
 */
export const isValidDateRange = (
  fromDate: Date,
  toDate: Date
): boolean => {
  return fromDate <= toDate;
};