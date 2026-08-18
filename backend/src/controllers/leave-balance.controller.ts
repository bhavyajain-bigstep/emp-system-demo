import {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  createLeaveBalanceService,
  getAllLeaveBalancesService,
  getEmployeeLeaveBalancesService,
  getLeaveBalanceService,
  updateLeaveBalanceService,
} from "../services/leave-balance.service";

export const createLeaveBalance =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const balance =
        await createLeaveBalanceService(
          req.body
        );

      return res.status(201).json({
        success: true,
        message:
          "Leave balance created successfully",
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  };

export const getAllLeaveBalances =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const balances =
        await getAllLeaveBalancesService();

      return res.status(200).json({
        success: true,
        message:
          "Leave balances fetched successfully",
        data: balances,
      });
    } catch (error) {
      next(error);
    }
  };

export const getEmployeeLeaveBalances =
  async (
    req: Request<{ employeeId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const yearParam =
        req.query.year;

      const year = yearParam
        ? Number(yearParam)
        : undefined;

      const balances =
        await getEmployeeLeaveBalancesService(
          req.params.employeeId,
          year
        );

      return res.status(200).json({
        success: true,
        message:
          "Employee leave balances fetched successfully",
        data: balances,
      });
    } catch (error) {
      next(error);
    }
  };

export const getLeaveBalance =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const balance =
        await getLeaveBalanceService(
          req.params.id
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave balance fetched successfully",
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  };

export const updateLeaveBalance =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const balance =
        await updateLeaveBalanceService(
          req.params.id,
          req.body.allocated
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave balance updated successfully",
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  };