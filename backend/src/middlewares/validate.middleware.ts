import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body"
) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    const dataToValidate =
      source === "query"
        ? req.query
        : source === "params"
        ? req.params
        : req.body;

    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      return next({
        statusCode: 400,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    if (source === "body") {
      req.body = result.data;
    } else if (source === "query") {
      req.query = result.data as any;
    } else if (source === "params") {
      req.params = result.data as any;
    }

    next();
  };
};