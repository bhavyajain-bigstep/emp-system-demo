import {
  ILeaveBalance,
  LeaveBalance,
} from "../models/leave-balance.model";

import { ClientSession, Types } from "mongoose";

export const findAllBalances =
  async (): Promise<ILeaveBalance[]> => {
    return LeaveBalance.find()
      .populate(
        "employeeId",
        "employeeCode name email"
      )
      .populate(
        "leaveTypeId",
        "name code annualQuota rules"
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
        "name code annualQuota rules"
      )
      .sort({
        year: -1,
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
        "name code annualQuota rules"
      );
  };

export const findBalance =
  async (
    employeeId: string,
    leaveTypeId: string,
    year: number,
    session?: ClientSession
  ): Promise<ILeaveBalance | null> => {
    const query = LeaveBalance.findOne({
      employeeId:
        new Types.ObjectId(employeeId),
      leaveTypeId:
        new Types.ObjectId(leaveTypeId),
      year,
    });

    if (session) {
      query.session(session);
    }

    return query;
  };

export const createBalance =
  async (
    data: Partial<ILeaveBalance>,
    session?: ClientSession
  ): Promise<ILeaveBalance> => {
    if (session) {
      const [balance] = await LeaveBalance.create([data], { session });
      return balance;
    }
    return LeaveBalance.create(data);
  };

export const updateBalance =
  async (
    id: string,
    data: Partial<ILeaveBalance>,
    session?: ClientSession
  ): Promise<ILeaveBalance | null> => {
    return LeaveBalance.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
        session,
      }
    );
  };

export const deductBalance = async (
  balanceId: string,
  days: number,
  session?: ClientSession
): Promise<ILeaveBalance | null> => {
  return LeaveBalance.findByIdAndUpdate(
    balanceId,
    {
      $inc: {
        used: days,
        available: -days,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    }
  );
};

export const restoreBalance = async (
  balanceId: string,
  days: number,
  session?: ClientSession
): Promise<ILeaveBalance | null> => {
  return LeaveBalance.findByIdAndUpdate(
    balanceId,
    {
      $inc: {
        used: -days,
        available: days,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    }
  );
};