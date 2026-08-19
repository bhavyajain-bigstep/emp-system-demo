import {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  approveLeaveRequestService,
  cancelLeaveRequestService,
  createLeaveRequestService,
  getEmployeeLeaveRequestsService,
  getPendingLeaveRequestsService,
  rejectLeaveRequestService,
} from "../services/leave-request.service";
import { findLeaveRequestById } from "../repositories/leave-request.repository";
import { AppError } from "../errors/app-error";

export const createLeaveRequest =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const employeeId =
        req.user?.userId;

      if (!employeeId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
          error: {
            code: "AUTHENTICATION_REQUIRED",
          },
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
        req.user?.userId;

      if (!employeeId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
          error: {
            code: "AUTHENTICATION_REQUIRED",
          },
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

export const getLeaveRequest =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const request = await findLeaveRequestById(req.params.id);
      if (!request) {
        throw new AppError("Leave request not found", 404, "LEAVE_REQUEST_NOT_FOUND");
      }

      const employeeIdStr = (request.employeeId as any)?._id
        ? (request.employeeId as any)._id.toString()
        : request.employeeId.toString();

      if (
        req.user?.role === "EMPLOYEE" &&
        req.user?.userId !== employeeIdStr
      ) {
        throw new AppError(
          "You do not have permission to view this leave request",
          403,
          "FORBIDDEN"
        );
      }

      return res.status(200).json({
        success: true,
        message: "Leave request fetched successfully",
        data: request,
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

      // If manager, filter to only their team members
      let filteredRequests = requests;
      if (req.user?.role === "MANAGER") {
        const managerId = req.user.userId;
        filteredRequests = requests.filter((r) => {
          const emp = r.employeeId as any;
          return emp?.managerId?.toString() === managerId;
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Pending leave requests fetched successfully",
        data: filteredRequests,
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
        req.user?.userId;

      if (!approverId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
          error: {
            code: "AUTHENTICATION_REQUIRED",
          },
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
        req.user?.userId;

      if (!approverId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
          error: {
            code: "AUTHENTICATION_REQUIRED",
          },
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

export const cancelLeaveRequest =
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role || "EMPLOYEE";

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
          error: {
            code: "AUTHENTICATION_REQUIRED",
          },
        });
      }

      const request =
        await cancelLeaveRequestService(
          req.params.id,
          userId,
          userRole
        );

      return res.status(200).json({
        success: true,
        message:
          "Leave request cancelled successfully",
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };