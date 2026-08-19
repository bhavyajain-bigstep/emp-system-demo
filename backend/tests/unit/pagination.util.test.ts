import { getPagination } from "../../src/utils/pagination.util";

describe("getPagination", () => {
  it("uses the supplied valid values", () => {
    expect(getPagination("2", "25", 10)).toEqual({ page: 2, limit: 25 });
  });

  it("clamps invalid and excessive values", () => {
    expect(getPagination("-3", "1000", 10)).toEqual({ page: 1, limit: 100 });
    expect(getPagination(undefined, "0", 20)).toEqual({ page: 1, limit: 20 });
  });
});
