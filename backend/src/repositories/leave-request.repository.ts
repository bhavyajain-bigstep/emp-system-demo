import {
  ILeaveRequest,
  LeaveRequest,
} from "../models/leave-request.model";

import { ClientSession, Types } from "mongoose";

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
      )
      .lean() as unknown as Promise<ILeaveRequest | null>;
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
      })
      .lean() as unknown as Promise<ILeaveRequest[]>;
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
      })
      .lean() as unknown as Promise<ILeaveRequest[]>;
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
    }).lean() as unknown as Promise<ILeaveRequest[]>;
  };

export const updateLeaveRequest =
  async (
    id: string,
    data: Partial<ILeaveRequest>,
    session?: ClientSession
  ): Promise<ILeaveRequest | null> => {
    return LeaveRequest.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
        session,
      }
    );
  };

export const findLeaveRequestByIdWithSession =
  async (
    id: string,
    session?: ClientSession
  ): Promise<ILeaveRequest | null> => {
    const query = LeaveRequest.findById(id)
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
    if (session) query.session(session);
    return query.lean() as unknown as Promise<ILeaveRequest | null>;
  };

export const findLeaveReportPage = async (
  filter: Record<string, unknown>,
  skip: number,
  limit: number
) => {
  const [records, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate({
        path: "employeeId",
        select: "employeeCode name email role departmentId managerId",
        populate: { path: "departmentId", select: "name" },
      })
      .populate("leaveTypeId", "name code annualQuota rules")
      .populate("approvedBy", "employeeCode name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as unknown as Promise<ILeaveRequest[]>,

    LeaveRequest.countDocuments(filter),
  ]);

  return { records, total };
};
