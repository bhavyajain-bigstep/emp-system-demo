import { validate } from "../../src/middlewares/validate.middleware";
import { z } from "zod";

describe("validate middleware", () => {
  const next = jest.fn();
  const res = {} as any;
  const schema = z.object({
    name: z.string().min(2),
    age: z.number().int().min(0),
  });

  beforeEach(() => {
    next.mockClear();
  });

  it("passes validation and replaces req.body with parsed data", () => {
    const req: any = { body: { name: "Alice", age: 30 } };
    validate(schema, "body")(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Alice", age: 30 });
  });

  it("calls next with a validation error for bad input", () => {
    const req: any = { body: { name: "A", age: -1 } };
    validate(schema, "body")(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    });
    expect(err.errors).toBeDefined();
  });

  it("validates query string data when source=query", () => {
    const querySchema = z.object({
      page: z.string().optional(),
    });
    const req: any = { query: { page: "1" } };
    validate(querySchema, "query")(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: "1" });
  });
});
