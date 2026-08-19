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
import { AppError } from "../errors/app-error";

export const createLeaveBalance =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const balance =
        await createLeaveBalanceService({
          ...req.body,
          actorId: req.user?.userId,
        });

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

export const getMyLeaveBalances =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const employeeId = req.user?.userId;
      if (!employeeId) {
        throw new AppError("Authentication required", 401, "AUTHENTICATION_REQUIRED");
      }

      const yearParam = req.query.year;
      const year = yearParam ? Number(yearParam) : undefined;

      const balances =
        await getEmployeeLeaveBalancesService(
          employeeId,
          year
        );

      return res.status(200).json({
        success: true,
        message:
          "My leave balances fetched successfully",
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
      const currentUserId = req.user?.userId;
      const currentUserRole = req.user?.role;

      // An employee can view their own; HR/Admin can view all; Manager can view team
      if (
        currentUserRole === "EMPLOYEE" &&
        currentUserId !== req.params.employeeId
      ) {
        throw new AppError(
          "You do not have permission to view other employees leave balances",
          403,
          "FORBIDDEN"
        );
      }

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
          req.body.allocated,
          req.user?.userId
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