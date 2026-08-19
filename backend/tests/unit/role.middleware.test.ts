import { authorize } from "../../src/middlewares/role.middleware";

describe("authorize", () => {
  it("rejects an authenticated user without an allowed role", () => {
    const next = jest.fn();
    authorize("HR", "ADMIN")(
      { user: { userId: "employee", employeeCode: "EMP-001", role: "EMPLOYEE" } } as any,
      {} as any,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: "FORBIDDEN" }));
  });

  it("allows an authorized user", () => {
    const next = jest.fn();
    authorize("HR", "ADMIN")(
      { user: { userId: "admin", employeeCode: "EMP-ADMIN", role: "ADMIN" } } as any,
      {} as any,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });
});
