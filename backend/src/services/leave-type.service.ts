import { Types } from "mongoose";

import { AppError } from "../errors/app-error";

import {
  createLeaveType,
  deleteLeaveType,
  findActiveLeaveTypes,
  findLeaveTypeByCode,
  findLeaveTypeById,
  findLeaveTypeByName,
  findLeaveTypes,
  updateLeaveType,
} from "../repositories/leave-type.repository";
import { logAuditEvent } from "./audit-log.service";

interface LeaveRulesInput {
  allowNegativeBalance: boolean;
  excludeWeekends: boolean;
  excludeMandatoryHolidays: boolean;
  allowHalfDay: boolean;
  allowCancellation: boolean;
  maxConsecutiveDays: number;
  minNoticeDays: number;
}

interface CreateLeaveTypeInput {
  name: string;
  code: string;
  annualQuota: number;
  rules: LeaveRulesInput;
  status?: "ACTIVE" | "INACTIVE";
}

export const createLeaveTypeService =
  async (
    data: CreateLeaveTypeInput,
    actorId?: string
  ) => {
    const existingCode =
      await findLeaveTypeByCode(
        data.code
      );

    if (existingCode) {
      throw new AppError(
        "Leave type code already exists",
        409,
        "LEAVE_TYPE_CODE_ALREADY_EXISTS"
      );
    }

    const existingName =
      await findLeaveTypeByName(
        data.name
      );

    if (existingName) {
      throw new AppError(
        "Leave type name already exists",
        409,
        "LEAVE_TYPE_NAME_ALREADY_EXISTS"
      );
    }

    if (
      data.rules.maxConsecutiveDays >
      data.annualQuota
    ) {
      throw new AppError(
        "Maximum consecutive days cannot exceed annual quota",
        400,
        "INVALID_LEAVE_RULE"
      );
    }

    const newLeaveType = await createLeaveType({
      ...data,
      code: data.code.toUpperCase(),
      status:
        data.status ?? "ACTIVE",
    });

    await logAuditEvent({
      actorId,
      action: "LEAVE_POLICY_UPDATED",
      entityType: "LEAVE_TYPE",
      entityId: newLeaveType._id.toString(),
      newValue: newLeaveType,
      metadata: { code: newLeaveType.code, annualQuota: newLeaveType.annualQuota },
    });

    return newLeaveType;
  };

export const getLeaveTypesService =
  async (
    includeInactive = false
  ) => {
    if (includeInactive) {
      return findLeaveTypes();
    }

    return findActiveLeaveTypes();
  };

export const getLeaveTypeService =
  async (
    id: string
  ) => {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid leave type ID",
        400,
        "INVALID_LEAVE_TYPE_ID"
      );
    }

    const leaveType =
      await findLeaveTypeById(id);

    if (!leaveType) {
      throw new AppError(
        "Leave type not found",
        404,
        "LEAVE_TYPE_NOT_FOUND"
      );
    }

    return leaveType;
  };

export const updateLeaveTypeService =
  async (
    id: string,
    data: Partial<CreateLeaveTypeInput>,
    actorId?: string
  ) => {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid leave type ID",
        400,
        "INVALID_LEAVE_TYPE_ID"
      );
    }

    const existing =
      await findLeaveTypeById(id);

    if (!existing) {
      throw new AppError(
        "Leave type not found",
        404,
        "LEAVE_TYPE_NOT_FOUND"
      );
    }

    if (data.code) {
      const existingCode =
        await findLeaveTypeByCode(
          data.code
        );

      if (
        existingCode &&
        existingCode._id.toString() !== id
      ) {
        throw new AppError(
          "Leave type code already exists",
          409,
          "LEAVE_TYPE_CODE_ALREADY_EXISTS"
        );
      }

      data.code =
        data.code.toUpperCase();
    }

    if (data.name) {
      const existingName =
        await findLeaveTypeByName(
          data.name
        );

      if (
        existingName &&
        existingName._id.toString() !== id
      ) {
        throw new AppError(
          "Leave type name already exists",
          409,
          "LEAVE_TYPE_NAME_ALREADY_EXISTS"
        );
      }
    }

    const annualQuota =
      data.annualQuota ??
      existing.annualQuota;

    const rules =
      data.rules ??
      existing.rules;

    if (
      rules.maxConsecutiveDays >
      annualQuota
    ) {
      throw new AppError(
        "Maximum consecutive days cannot exceed annual quota",
        400,
        "INVALID_LEAVE_RULE"
      );
    }

    const updated = await updateLeaveType(
      id,
      data
    );

    await logAuditEvent({
      actorId,
      action: "LEAVE_POLICY_UPDATED",
      entityType: "LEAVE_TYPE",
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    return updated;
  };

export const deleteLeaveTypeService =
  async (
    id: string,
    actorId?: string
  ) => {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid leave type ID",
        400,
        "INVALID_LEAVE_TYPE_ID"
      );
    }

    const leaveType =
      await findLeaveTypeById(id);

    if (!leaveType) {
      throw new AppError(
        "Leave type not found",
        404,
        "LEAVE_TYPE_NOT_FOUND"
      );
    }

    /*
     * We should generally avoid physically
     * deleting leave types because existing
     * LeaveBalance and LeaveRequest records
     * may reference them.
     *
     * Instead, deactivate them.
     */
    const deactivated = await updateLeaveType(
      id,
      {
        status: "INACTIVE",
      }
    );

    await logAuditEvent({
      actorId,
      action: "LEAVE_POLICY_UPDATED",
      entityType: "LEAVE_TYPE",
      entityId: id,
      oldValue: leaveType,
      newValue: deactivated,
      metadata: { action: "DEACTIVATED" },
    });

    return deactivated;
  };