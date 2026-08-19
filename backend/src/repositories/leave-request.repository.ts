import {
  ILeaveRequest,
  LeaveRequest,
} from "../models/leave-request.model";

import { Types } from "mongoose";

export const createLeaveRequest =
  async (
    data: Partial<ILeaveRequest>
  ): Promise<ILeaveRequest> => {
    return LeaveRequest.create(data);
  };

export const findLeaveRequestById =
  async (
    id: string
  ): Promise<ILeaveRequest | null> => {
    return LeaveRequest.findById(id)
      .populate(
        "employeeId",
        "employeeCode name email managerId"
      )
      .populate(
        "leaveTypeId",
        "name code annualQuota rules"
      )
      .populate(
        "approvedBy",
        "employeeCode name email role"
      );
  };

export const findEmployeeLeaveRequests =
  async (
    employeeId: string
  ): Promise<ILeaveRequest[]> => {
    return LeaveRequest.find({
      employeeId:
        new Types.ObjectId(employeeId),
    })
      .populate(
        "leaveTypeId",
        "name code"
      )
      .populate(
        "approvedBy",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });
  };

export const findPendingLeaveRequests =
  async (): Promise<ILeaveRequest[]> => {
    return LeaveRequest.find({
      status: "PENDING",
    })
      .populate(
        "employeeId",
        "employeeCode name email managerId departmentId"
      )
      .populate(
        "leaveTypeId",
        "name code"
      )
      .sort({
        createdAt: 1,
      });
  };

export const findOverlappingLeave =
  async (
    employeeId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<ILeaveRequest[]> => {
    return LeaveRequest.find({
      employeeId:
        new Types.ObjectId(employeeId),

      status: {
        $in: [
          "PENDING",
          "APPROVED",
        ],
      },

      fromDate: {
        $lte: toDate,
      },

      toDate: {
        $gte: fromDate,
      },
    });
  };

export const updateLeaveRequest =
  async (
    id: string,
    data: Partial<ILeaveRequest>
  ): Promise<ILeaveRequest | null> => {
    return LeaveRequest.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  };