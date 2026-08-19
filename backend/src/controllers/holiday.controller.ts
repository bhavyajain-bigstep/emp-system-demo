import {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  createHolidayService,
  deleteHolidayService,
  getHolidayService,
  getHolidaysService,
  updateHolidayService,
} from "../services/holiday.service";

export const createHoliday =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const createdBy =
        req.user?.userId;

      if (!createdBy) {
        res.status(401).json({
          success: false,
          message:
            "Authentication required",
          error: {
            code: "AUTH_REQUIRED",
          },
        });

        return;
      }

      const holiday =
        await createHolidayService({
          date: new Date(
            req.body.date
          ),

          name: req.body.name,

          optional:
            req.body.optional,

          description:
            req.body.description,

          createdBy,
        });

      res.status(201).json({
        success: true,
        message:
          "Holiday created successfully",
        data: holiday,
      });
    } catch (error) {
      next(error);
    }
  };

export const getHolidays =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const year = req.query.year
        ? Number(req.query.year)
        : undefined;

      const month = req.query.month
        ? Number(req.query.month)
        : undefined;

      const holidays =
        await getHolidaysService(
          year,
          month
        );

      res.status(200).json({
        success: true,
        message:
          "Holidays fetched successfully",
        data: holidays,
      });
    } catch (error) {
      next(error);
    }
  };

export const getHoliday =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const holiday =
        await getHolidayService(
          req.params.id
        );

      res.status(200).json({
        success: true,
        message:
          "Holiday fetched successfully",
        data: holiday,
      });
    } catch (error) {
      next(error);
    }
  };

export const updateHoliday =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const holiday =
        await updateHolidayService(
          req.params.id,
          {
            date: req.body.date
              ? new Date(
                  req.body.date
                )
              : undefined,

            name:
              req.body.name,

            optional:
              req.body.optional,

            description:
              req.body.description,
          },
          req.user?.userId
        );

      res.status(200).json({
        success: true,
        message:
          "Holiday updated successfully",
        data: holiday,
      });
    } catch (error) {
      next(error);
    }
  };

export const deleteHoliday =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await deleteHolidayService(
        req.params.id,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message:
          "Holiday deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };