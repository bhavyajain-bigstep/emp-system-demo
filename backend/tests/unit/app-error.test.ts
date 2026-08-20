import { AppError } from "../../src/errors/app-error";

describe("AppError", () => {
  it("captures message, statusCode and code", () => {
    const err = new AppError("oops", 418, "TEAPOT");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("oops");
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("TEAPOT");
  });

  it("supports omitting the error code", () => {
    const err = new AppError("bad", 400);
    expect(err.code).toBeUndefined();
    expect(err.statusCode).toBe(400);
  });

  it("preserves instanceof across inheritance", () => {
    const err = new AppError("x", 500);
    try {
      throw err;
    } catch (e) {
      expect(e instanceof AppError).toBe(true);
      expect(e instanceof Error).toBe(true);
    }
  });
});
