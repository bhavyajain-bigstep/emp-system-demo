import {
  ILeaveRequest,
  LeaveRequest,
} from "../models/leave-request.model";

import { ClientSession, Types } from "mongoose";

export const createLeaveRequest =
  async (
    data: Partial<ILeaveRequest>,
    session?: ClientSession
  ): Promise<ILeaveRequest> => {
    if (session) {
      const [request] = await LeaveRequest.create([data], { session });
      return request;
    }
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

/**
 * Raw (unpopulated) read used inside write transactions.
 */
export const findLeaveRequestByIdForUpdate =
  async (
    id: string,
    session?: ClientSession
  ): Promise<ILeaveRequest | null> => {
    return LeaveRequest.findById(id).session(session ?? null);
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
    toDate: Date,
    session?: ClientSession
  ): Promise<ILeaveRequest[]> => {
    const query = LeaveRequest.find({
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

    if (session) {
      query.session(session ?? null);
    }

    return query;
  };

export const updateLeaveRequest =
  async (
    id: string,
    data: Partial<ILeaveRequest>,
    session?: ClientSession
  ): Promise<ILeaveRequest | null> => {
    const query = LeaveRequest.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );

    if (session) {
      query.session(session ?? null);
    }

    return query;
  };