import { Types } from "mongoose";

import {
  calculateLeaveDays,
  calculateLeaveDaysDetailed,
} from "../../src/services/leave-day.service";
import { Holiday } from "../../src/models/holiday.model";
import { setupTestDb } from "../helpers/test-db";

setupTestDb();

const createHoliday = async (
  date: Date,
  optional = false
) => {
  return Holiday.create({
    date,
    name: "Test Holiday",
    optional,
    createdBy: new Types.ObjectId(),
  });
};

describe("leave-day.service", () => {
  describe("calculateLeaveDays (basic)", () => {
    it("returns 5 for a Mon-Fri week with no holidays", async () => {
      // Mon 2026-08-24 -> Fri 2026-08-28
      const days = await calculateLeaveDays(
        "2026-08-24T00:00:00Z",
        "2026-08-28T00:00:00Z"
      );
      expect(days).toBe(5);
    });

    it("excludes weekends by default", async () => {
      // Fri 2026-08-21 -> Mon 2026-08-24
      const days = await calculateLeaveDays(
        "2026-08-21T00:00:00Z",
        "2026-08-24T00:00:00Z"
      );
      expect(days).toBe(2);
    });

    it("counts weekends when excludeWeekends is false", async () => {
      const days = await calculateLeaveDays(
        "2026-08-21T00:00:00Z",
        "2026-08-24T00:00:00Z",
        false
      );
      expect(days).toBe(4);
    });

    it("returns 0 when fromDate > toDate", async () => {
      const days = await calculateLeaveDays(
        "2026-08-30T00:00:00Z",
        "2026-08-20T00:00:00Z"
      );
      expect(days).toBe(0);
    });

    it("excludes mandatory holidays in the range", async () => {
      await createHoliday(new Date("2026-08-26T00:00:00Z"), false);
      // Mon 2026-08-24 -> Fri 2026-08-28 (5 weekdays, 1 holiday = 4)
      const days = await calculateLeaveDays(
        "2026-08-24T00:00:00Z",
        "2026-08-28T00:00:00Z"
      );
      expect(days).toBe(4);
    });

    it("does not exclude optional holidays unless asked", async () => {
      await createHoliday(new Date("2026-08-26T00:00:00Z"), true);
      const days = await calculateLeaveDays(
        "2026-08-24T00:00:00Z",
        "2026-08-28T00:00:00Z"
      );
      expect(days).toBe(5);
    });

    it("excludes optional holidays when requested", async () => {
      await createHoliday(new Date("2026-08-26T00:00:00Z"), true);
      const days = await calculateLeaveDays(
        "2026-08-24T00:00:00Z",
        "2026-08-28T00:00:00Z",
        true,
        true,
        "Asia/Kolkata",
        true
      );
      expect(days).toBe(4);
    });
  });

  describe("calculateLeaveDaysDetailed", () => {
    it("returns detailed breakdown of a range", async () => {
      const result = await calculateLeaveDaysDetailed({
        fromDate: "2026-08-21T00:00:00Z", // Friday
        toDate: "2026-08-24T00:00:00Z", // Monday
        timezone: "Asia/Kolkata",
        excludeWeekends: true,
        excludeMandatoryHolidays: true,
      });

      expect(result).toMatchObject({
        totalCalendarDays: 4,
        weekendDays: 2,
        holidayDays: 0,
        workingDays: 2,
        days: 2,
      });
    });

    it("returns zeros when fromDate > toDate", async () => {
      const result = await calculateLeaveDaysDetailed({
        fromDate: "2026-08-30T00:00:00Z",
        toDate: "2026-08-20T00:00:00Z",
      });

      expect(result).toEqual({
        days: 0,
        totalCalendarDays: 0,
        weekendDays: 0,
        holidayDays: 0,
        workingDays: 0,
      });
    });
  });
});
