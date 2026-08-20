import {
  isWeekend,
  addOneDay,
  startOfDayUTC,
  isValidDateRange,
} from "../../src/utils/leave-date.util";

describe("leave-date.util", () => {
  describe("isWeekend", () => {
    it("returns true for Saturday", () => {
      expect(isWeekend(new Date("2026-08-22T00:00:00Z"))).toBe(true);
    });

    it("returns true for Sunday", () => {
      expect(isWeekend(new Date("2026-08-23T00:00:00Z"))).toBe(true);
    });

    it("returns false for a weekday", () => {
      expect(isWeekend(new Date("2026-08-19T00:00:00Z"))).toBe(false);
    });
  });

  describe("addOneDay", () => {
    it("returns the next calendar day", () => {
      const next = addOneDay(new Date("2026-08-20T10:00:00Z"));
      expect(next.getUTCDate()).toBe(21);
      expect(next.getUTCMonth()).toBe(7);
    });

    it("crosses month boundaries", () => {
      const next = addOneDay(new Date("2026-08-31T10:00:00Z"));
      expect(next.getUTCMonth()).toBe(8);
      expect(next.getUTCDate()).toBe(1);
    });

    it("does not mutate the input date", () => {
      const date = new Date("2026-08-20T10:00:00Z");
      const before = date.getTime();
      addOneDay(date);
      expect(date.getTime()).toBe(before);
    });
  });

  describe("startOfDayUTC", () => {
    it("zeroes the time portion", () => {
      const date = startOfDayUTC(new Date("2026-08-20T15:32:10.123Z"));
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
      expect(date.getUTCDate()).toBe(20);
    });
  });

  describe("isValidDateRange", () => {
    it("returns true when from <= to", () => {
      expect(
        isValidDateRange(
          new Date("2026-08-20"),
          new Date("2026-08-25")
        )
      ).toBe(true);
    });

    it("returns true when from equals to", () => {
      const d = new Date("2026-08-20");
      expect(isValidDateRange(d, d)).toBe(true);
    });

    it("returns false when from is after to", () => {
      expect(
        isValidDateRange(
          new Date("2026-08-25"),
          new Date("2026-08-20")
        )
      ).toBe(false);
    });
  });
});
