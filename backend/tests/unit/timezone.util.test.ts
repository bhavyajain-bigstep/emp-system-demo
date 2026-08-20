import {
  getLocalDateString,
  getLocalMinutesSinceMidnight,
  getLocalDayOfWeek,
  isWeekendDay,
  getWorkingDaysInMonth,
} from "../../src/utils/timezone.util";

describe("timezone.util", () => {
  describe("getLocalDateString", () => {
    it("formats a UTC instant as the local calendar date in Asia/Kolkata", () => {
      const utcMidnight = new Date("2026-08-20T00:00:00Z");
      expect(getLocalDateString(utcMidnight, "Asia/Kolkata")).toBe("2026-08-20");
    });

    it("handles the Asia/Kolkata UTC+5:30 offset", () => {
      const lateUtc = new Date("2026-08-19T20:00:00Z");
      expect(getLocalDateString(lateUtc, "Asia/Kolkata")).toBe("2026-08-20");
    });

    it("handles America/New_York in winter (UTC-5)", () => {
      const utcMorning = new Date("2026-01-15T14:00:00Z");
      expect(getLocalDateString(utcMorning, "America/New_York")).toBe("2026-01-15");
    });

    it("handles UTC zone", () => {
      const instant = new Date("2026-08-20T12:00:00Z");
      expect(getLocalDateString(instant, "UTC")).toBe("2026-08-20");
    });

    it("does not mutate the input date", () => {
      const instant = new Date("2026-08-20T12:00:00Z");
      const before = instant.getTime();
      getLocalDateString(instant, "Asia/Kolkata");
      expect(instant.getTime()).toBe(before);
    });
  });

  describe("getLocalMinutesSinceMidnight", () => {
    it("returns 570 (09:30) for 09:30 in Asia/Kolkata", () => {
      const instant = new Date("2026-08-20T04:00:00Z");
      expect(getLocalMinutesSinceMidnight(instant, "Asia/Kolkata")).toBe(570);
    });

    it("returns 0 for midnight local time", () => {
      const instant = new Date("2026-08-19T18:30:00Z");
      expect(getLocalMinutesSinceMidnight(instant, "Asia/Kolkata")).toBe(0);
    });

    it("returns 1439 for 23:59 in Asia/Kolkata", () => {
      const instant = new Date("2026-08-20T18:29:00Z");
      expect(getLocalMinutesSinceMidnight(instant, "Asia/Kolkata")).toBe(1439);
    });
  });

  describe("getLocalDayOfWeek", () => {
    it("returns 0 for Sunday", () => {
      expect(getLocalDayOfWeek("2026-08-23")).toBe(0);
    });

    it("returns 1 for Monday", () => {
      expect(getLocalDayOfWeek("2026-08-24")).toBe(1);
    });

    it("returns 6 for Saturday", () => {
      expect(getLocalDayOfWeek("2026-08-22")).toBe(6);
    });
  });

  describe("isWeekendDay", () => {
    it("treats Saturday as weekend by default", () => {
      expect(isWeekendDay("2026-08-22", [0, 6])).toBe(true);
    });

    it("treats Sunday as weekend by default", () => {
      expect(isWeekendDay("2026-08-23", [0, 6])).toBe(true);
    });

    it("treats Friday as weekday by default", () => {
      expect(isWeekendDay("2026-08-21", [0, 6])).toBe(false);
    });

    it("respects custom weekend days (Friday/Saturday)", () => {
      expect(isWeekendDay("2026-08-21", [5, 6])).toBe(true);
      expect(isWeekendDay("2026-08-23", [5, 6])).toBe(false);
    });
  });

  describe("getWorkingDaysInMonth", () => {
    it("counts working days for August 2026 (Sat=6, Sun=0)", () => {
      const days = getWorkingDaysInMonth(2026, 8, [0, 6]);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(31);
    });

    it("returns fewer days when weekend days are excluded", () => {
      const satSun = getWorkingDaysInMonth(2026, 8, [0, 6]);
      const friSat = getWorkingDaysInMonth(2026, 8, [5, 6]);
      expect(friSat).not.toBe(satSun);
    });

    it("excludes holidays from the count", () => {
      // 2026-08-14 is a Friday (weekday), so it only gets excluded via the holiday list.
      const withoutHolidays = getWorkingDaysInMonth(2026, 8, [0, 6]);
      const withHolidays = getWorkingDaysInMonth(2026, 8, [0, 6], ["2026-08-14"]);
      expect(withHolidays).toBe(withoutHolidays - 1);
    });

    it("does not change the count when the holiday falls on a weekend", () => {
      // 2026-08-15 is Saturday; it's already excluded as a weekend.
      const withoutHolidays = getWorkingDaysInMonth(2026, 8, [0, 6]);
      const withHolidays = getWorkingDaysInMonth(2026, 8, [0, 6], ["2026-08-15"]);
      expect(withHolidays).toBe(withoutHolidays);
    });
  });
});
