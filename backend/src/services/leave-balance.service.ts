import { Types } from "mongoose";

import { AppError } from "../errors/app-error";

import {
  createBalance,
  findAllBalances,
  findBalance,
  findBalanceById,
  findBalancesByEmployee,
  updateBalance,
} from "../repositories/leave-balance.repository";

import { Employee } from "../models/employee.model";
import { LeaveType } from "../models/leave-type.model";
import { logAuditEvent } from "./audit-log.service";

interface CreateBalanceInput {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  actorId?: string;
}

export const createLeaveBalanceService =
  async (
    data: CreateBalanceInput
  ) => {
    if (
      !Types.ObjectId.isValid(
        data.employeeId
      )
    ) {
      throw new AppError(
        "Invalid employee ID",
        400,
        "INVALID_EMPLOYEE_ID"
      );
    }

    if (
      !Types.ObjectId.isValid(
        data.leaveTypeId
      )
    ) {
      throw new AppError(
        "Invalid leave type ID",
        400,
        "INVALID_LEAVE_TYPE_ID"
      );
    }

    const employee =
      await Employee.findById(
        data.employeeId
      );

    if (!employee) {
      throw new AppError(
        "Employee not found",
        404,
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const leaveType =
      await LeaveType.findById(
        data.leaveTypeId
      );

    if (!leaveType) {
      throw new AppError(
        "Leave type not found",
        404,
        "LEAVE_TYPE_NOT_FOUND"
      );
    }

    if (
      leaveType.status !== "ACTIVE"
    ) {
      throw new AppError(
        "Cannot create balance for an inactive leave type",
        400,
        "INACTIVE_LEAVE_TYPE"
      );
    }

    const existing =
      await findBalance(
        data.employeeId,
        data.leaveTypeId,
        data.year
      );

    if (existing) {
      throw new AppError(
        "Leave balance already exists for this employee, leave type and year",
        409,
        "LEAVE_BALANCE_ALREADY_EXISTS"
      );
    }

    const newBalance = await createBalance({
      employeeId:
        new Types.ObjectId(
          data.employeeId
        ),

      leaveTypeId:
        new Types.ObjectId(
          data.leaveTypeId
        ),

      year: data.year,

      allocated: data.allocated,

      used: 0,

      available: data.allocated,
    });

    await logAuditEvent({
      actorId: data.actorId,
      action: "LEAVE_BALANCE_CREATED",
      entityType: "LEAVE_BALANCE",
      entityId: newBalance._id.toString(),
      newValue: newBalance,
      metadata: {
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        year: data.year,
        allocated: data.allocated,
      },
    });

    return newBalance;
  };

export const getAllLeaveBalancesService =
  async () => {
    return findAllBalances();
  };

export const getEmployeeLeaveBalancesService =
  async (
    employeeId: string,
    year?: number
  ) => {
    if (
      !Types.ObjectId.isValid(
        employeeId
      )
    ) {
      throw new AppError(
        "Invalid employee ID",
        400,
        "INVALID_EMPLOYEE_ID"
      );
    }

    const employee =
      await Employee.findById(
        employeeId
      );

    if (!employee) {
      throw new AppError(
        "Employee not found",
        404,
        "EMPLOYEE_NOT_FOUND"
      );
    }

    return findBalancesByEmployee(
      employeeId,
      year
    );
  };

export const getLeaveBalanceService =
  async (
    id: string
  ) => {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid leave balance ID",
        400,
        "INVALID_LEAVE_BALANCE_ID"
      );
    }

    const balance =
      await findBalanceById(id);

    if (!balance) {
      throw new AppError(
        "Leave balance not found",
        404,
        "LEAVE_BALANCE_NOT_FOUND"
      );
    }

    return balance;
  };

export const updateLeaveBalanceService =
  async (
    id: string,
    allocated: number,
    actorId?: string
  ) => {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid leave balance ID",
        400,
        "INVALID_LEAVE_BALANCE_ID"
      );
    }

    const balance =
      await findBalanceById(id);

    if (!balance) {
      throw new AppError(
        "Leave balance not found",
        404,
        "LEAVE_BALANCE_NOT_FOUND"
      );
    }

    if (
      allocated < balance.used
    ) {
      throw new AppError(
        `Allocated balance cannot be less than already used balance (${balance.used})`,
        400,
        "INVALID_ALLOCATION"
      );
    }

    const available =
      allocated - balance.used;

    const updated = await updateBalance(
      id,
      {
        allocated,
        available,
      }
    );

    await logAuditEvent({
      actorId,
      action: "LEAVE_BALANCE_UPDATED",
      entityType: "LEAVE_BALANCE",
      entityId: id,
      oldValue: { allocated: balance.allocated, available: balance.available },
      newValue: { allocated, available },
    });

    return updated;
  };