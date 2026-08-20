import { authenticate, AuthenticatedRequest } from "../../src/middlewares/auth.middleware";
import { generateAccessToken } from "../../src/utils/jwt";

describe("authenticate middleware", () => {
  const buildReq = (authorization?: string) =>
    ({ headers: authorization ? { authorization } : {} } as AuthenticatedRequest);
  const res = {} as any;
  const next = jest.fn();

  beforeEach(() => {
    next.mockClear();
  });

  it("returns 401 when no Authorization header is provided", () => {
    authenticate(buildReq(), res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: "AUTHENTICATION_REQUIRED" })
    );
  });

  it("returns 401 for a malformed Authorization header", () => {
    authenticate(buildReq("NotBearer xyz"), res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: "INVALID_AUTH_HEADER" })
    );
  });

  it("returns 401 for an invalid JWT", () => {
    authenticate(buildReq("Bearer not.a.real.jwt"), res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.name).toBe("JsonWebTokenError");
  });

  it("populates req.user and calls next() when a valid token is provided", () => {
    const token = generateAccessToken({
      userId: "507f1f77bcf86cd799439011",
      employeeCode: "EMP-001",
      role: "EMPLOYEE",
    });

    const req = buildReq(`Bearer ${token}`);
    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({
      userId: "507f1f77bcf86cd799439011",
      employeeCode: "EMP-001",
      role: "EMPLOYEE",
    });
  });
});
