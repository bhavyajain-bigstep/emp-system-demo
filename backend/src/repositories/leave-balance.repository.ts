import {
  ILeaveBalance,
  LeaveBalance,
} from "../models/leave-balance.model";

import { Types } from "mongoose";

export const findAllBalances =
  async (): Promise<ILeaveBalance[]> => {
    return LeaveBalance.find()
      .populate(
        "employeeId",
        "employeeCode name email"
      )
      .populate(
        "leaveTypeId",
        "name code annualQuota"
      )
      .sort({
        year: -1,
      });
  };

export const findBalancesByEmployee =
  async (
    employeeId: string,
    year?: number
  ): Promise<ILeaveBalance[]> => {
    const filter: {
      employeeId: Types.ObjectId;
      year?: number;
    } = {
      employeeId:
        new Types.ObjectId(employeeId),
    };

    if (year) {
      filter.year = year;
    }

    return LeaveBalance.find(filter)
      .populate(
        "leaveTypeId",
        "name code annualQuota"
      )
      .sort({
        leaveTypeId: 1,
      });
  };

export const findBalanceById =
  async (
    id: string
  ): Promise<ILeaveBalance | null> => {
    return LeaveBalance.findById(id)
      .populate(
        "employeeId",
        "employeeCode name email"
      )
      .populate(
        "leaveTypeId",
        "name code annualQuota"
      );
  };

export const findBalance =
  async (
    employeeId: string,
    leaveTypeId: string,
    year: number
  ): Promise<ILeaveBalance | null> => {
    return LeaveBalance.findOne({
      employeeId:
        new Types.ObjectId(employeeId),

      leaveTypeId:
        new Types.ObjectId(leaveTypeId),

      year,
    });
  };

export const createBalance =
  async (
    data: Partial<ILeaveBalance>
  ): Promise<ILeaveBalance> => {
    return LeaveBalance.create(data);
  };

export const updateBalance =
  async (
    id: string,
    data: Partial<ILeaveBalance>
  ): Promise<ILeaveBalance | null> => {
    return LeaveBalance.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  };