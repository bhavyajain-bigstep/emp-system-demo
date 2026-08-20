import { correlationMiddleware, CorrelatedRequest } from "../../src/middlewares/correlation.middleware";

describe("correlationMiddleware", () => {
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses an inbound X-Correlation-ID header when provided", () => {
    const req: any = {
      method: "GET",
      path: "/test",
      headers: { "x-correlation-id": "abc-123" },
    };
    const res: any = {
      setHeader: jest.fn(),
      on: jest.fn(),
    };

    correlationMiddleware(req, res, jest.fn());

    expect(req.correlationId).toBe("abc-123");
    expect(req.logContext.correlationId).toBe("abc-123");
    expect(res.setHeader).toHaveBeenCalledWith("X-Correlation-ID", "abc-123");
  });

  it("generates a correlation ID when none is provided", () => {
    const req: any = {
      method: "POST",
      path: "/x",
      headers: {},
    };
    const res: any = {
      setHeader: jest.fn(),
      on: jest.fn(),
    };

    correlationMiddleware(req, res, jest.fn());

    expect(req.correlationId).toMatch(/^\d+-/);
    expect(req.logContext.method).toBe("POST");
    expect(req.logContext.path).toBe("/x");
  });

  it("registers a finish handler and emits a log on completion", () => {
    const req: any = {
      method: "GET",
      path: "/x",
      headers: {},
    };
    const res: any = {
      statusCode: 200,
      setHeader: jest.fn(),
      on: jest.fn((event, cb) => {
        if (event === "finish") {
          cb();
        }
      }),
    };

    correlationMiddleware(req, res, jest.fn());

    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  it("captures user info when present", () => {
    const req: any = {
      method: "GET",
      path: "/me",
      headers: {},
      user: { userId: "u1", role: "EMPLOYEE" },
    };
    const res: any = {
      setHeader: jest.fn(),
      on: jest.fn(),
    };

    correlationMiddleware(req, res, jest.fn());

    expect(req.logContext.userId).toBe("u1");
    expect(req.logContext.role).toBe("EMPLOYEE");
  });
});
