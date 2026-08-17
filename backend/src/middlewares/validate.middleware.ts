import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next({
        statusCode: 400,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    req.body = result.data;

    next();
  };
};