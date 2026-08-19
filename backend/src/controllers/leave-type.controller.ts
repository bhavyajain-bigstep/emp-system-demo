import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createLeaveTypeService,
  deleteLeaveTypeService,
  getLeaveTypeService,
  getLeaveTypesService,
  updateLeaveTypeService,
} from "../services/leave-type.service";

export const createLeaveType =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const leaveType =
        await createLeaveTypeService(
          req.body,
          req.user?.userId
        );

      return res.status(201).json({
        success: true,
        message:
          "Leave type created successfully",
        data: leaveType,
      });
    } catch (error) {
      next(error);
    }
  };

export const getLeaveTypes =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const includeInactive =
        req.query.includeInactive ===
        "true";

      const leaveTypes =
        await getLeaveTypesService(
          includeInactive
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave types fetched successfully",
        data: leaveTypes,
      });
    } catch (error) {
      next(error);
    }
  };

export const getLeaveType =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const leaveType =
        await getLeaveTypeService(
          req.params.id
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave type fetched successfully",
        data: leaveType,
      });
    } catch (error) {
      next(error);
    }
  };

export const updateLeaveType =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const leaveType =
        await updateLeaveTypeService(
          req.params.id,
          req.body,
          req.user?.userId
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave type updated successfully",
        data: leaveType,
      });
    } catch (error) {
      next(error);
    }
  };

export const deleteLeaveType =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const leaveType =
        await deleteLeaveTypeService(
          req.params.id,
          req.user?.userId
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave type deactivated successfully",
        data: leaveType,
      });
    } catch (error) {
      next(error);
    }
  };