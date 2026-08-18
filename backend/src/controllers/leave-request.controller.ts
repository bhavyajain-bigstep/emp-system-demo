import {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  approveLeaveRequestService,
  createLeaveRequestService,
  getEmployeeLeaveRequestsService,
  getPendingLeaveRequestsService,
  rejectLeaveRequestService,
} from "../services/leave-request.service";

export const createLeaveRequest =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      /*
       * IMPORTANT:
       *
       * employeeId should eventually come
       * from req.user.id after authentication.
       *
       * For now we expect req.user to exist.
       */
      const employeeId =
        req.user?.id;

      if (!employeeId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const request =
        await createLeaveRequestService({
          employeeId,

          leaveTypeId:
            req.body.leaveTypeId,

          fromDate:
            new Date(
              req.body.fromDate
            ),

          toDate:
            new Date(
              req.body.toDate
            ),

          reason:
            req.body.reason,
        });

      return res.status(201).json({
        success: true,
        message:
          "Leave request submitted successfully",
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };

export const getMyLeaveRequests =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const employeeId =
        req.user?.id;

      if (!employeeId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const requests =
        await getEmployeeLeaveRequestsService(
          employeeId
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave requests fetched successfully",
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  };

export const getPendingLeaveRequests =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const requests =
        await getPendingLeaveRequestsService();

      return res.status(200).json({
        success: true,
        message:
          "Pending leave requests fetched successfully",
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  };

export const approveLeaveRequest =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const approverId =
        req.user?.id;

      if (!approverId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const request =
        await approveLeaveRequestService(
          req.params.id,
          approverId
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave request approved successfully",
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };

export const rejectLeaveRequest =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const approverId =
        req.user?.id;

      if (!approverId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const request =
        await rejectLeaveRequestService(
          req.params.id,
          approverId,
          req.body.rejectionReason
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave request rejected successfully",
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };