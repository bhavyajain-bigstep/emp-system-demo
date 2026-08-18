/**
 * Timezone-aware date helpers. Never use server-local `new Date()` parsing
 * or naive string slicing for business-day logic — always go through here.
 */

export const getLocalDateString = (date: Date, timezone: string): string => {
  // en-CA formats as YYYY-MM-DD, which is exactly what we want.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const getLocalMinutesSinceMidnight = (
  date: Date,
  timezone: string
): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
};

// dateStr is a plain "YYYY-MM-DD" local calendar date — once it's a plain
// date string, it's timezone-agnostic, so UTC parsing here is safe.
export const getLocalDayOfWeek = (dateStr: string): number => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

export const isWeekendDay = (
  dateStr: string,
  weekendDays: number[]
): boolean => {
  return weekendDays.includes(getLocalDayOfWeek(dateStr));
};

/**
 * holidayDateStrings is optional and currently always empty in practice —
 * the Holiday collection lives in the Leave module and isn't wired in yet.
 * Signature is ready for it so nothing needs to change here later.
 */
export const getWorkingDaysInMonth = (
  year: number,
  month: number, // 1-12
  weekendDays: number[],
  holidayDateStrings: string[] = []
): number => {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    if (isWeekendDay(dateStr, weekendDays)) continue;
    if (holidayDateStrings.includes(dateStr)) continue;

    workingDays++;
  }

  return workingDays;
};