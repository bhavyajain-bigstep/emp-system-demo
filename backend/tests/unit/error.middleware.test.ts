import { errorHandler } from "../../src/middlewares/error.middleware";
import { AppError } from "../../src/errors/app-error";

describe("errorHandler middleware", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const invoke = (err: any) => {
    const req: any = { path: "/x", method: "POST" };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    errorHandler(err, req, res, jest.fn());
    return { status: res.status, json: res.json };
  };

  it("formats AppError with its statusCode and code", () => {
    const err = new AppError("Boom", 403, "FORBIDDEN");
    const res = invoke(err);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Boom",
      error: { code: "FORBIDDEN" },
    });
  });

  it("handles Mongoose duplicate key errors (code 11000)", () => {
    const err = { code: 11000, keyPattern: { email: 1 } };
    const res = invoke(err);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "A record with this email already exists",
      error: { code: "DUPLICATE_KEY_ERROR" },
    });
  });

  it("handles CastError (invalid ObjectId)", () => {
    const err = { name: "CastError", path: "id", value: "bad" };
    const res = invoke(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: "INVALID_ID_FORMAT" } })
    );
  });

  it("handles Mongoose ValidationError", () => {
    const err = { name: "ValidationError", message: "bad" };
    const res = invoke(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "bad",
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("handles JWT errors", () => {
    const err = { name: "JsonWebTokenError" };
    const res = invoke(err);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("handles ZodError-style validation errors", () => {
    const err = { errors: { fieldErrors: { name: ["Required"] } } };
    const res = invoke(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: "VALIDATION_ERROR" }) })
    );
  });

  it("falls back to 500 for unknown errors", () => {
    const err = new Error("unknown");
    const res = invoke(err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
  });

  it("honors custom statusCode on plain errors", () => {
    const err: any = new Error("custom");
    err.statusCode = 418;
    err.code = "TEAPOT";
    const res = invoke(err);
    expect(res.status).toHaveBeenCalledWith(418);
  });
});
