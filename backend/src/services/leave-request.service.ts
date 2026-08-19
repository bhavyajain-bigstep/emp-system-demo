import { Types } from "mongoose";

import { AppError } from "../errors/app-error";

import { Employee } from "../models/employee.model";
import { LeaveType } from "../models/leave-type.model";

import {
  createLeaveRequest,
  findEmployeeLeaveRequests,
  findLeaveRequestById,
  findOverlappingLeave,
  findPendingLeaveRequests,
  updateLeaveRequest,
} from "../repositories/leave-request.repository";

import {
  deductBalance,
  findBalance,
  restoreBalance,
  updateBalance,
} from "../repositories/leave-balance.repository";

import { calculateLeaveDays } from "./leave-day.service";
import { logAuditEvent } from "./audit-log.service";
import { notificationService } from "./notification.service";

interface CreateLeaveRequestInput {
  employeeId: string;
  leaveTypeId: string;
  fromDate: Date;
  toDate: Date;
  reason: string;
}

export const createLeaveRequestService =
  async (
    data: CreateLeaveRequestInput
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

    if (
      data.fromDate > data.toDate
    ) {
      throw new AppError(
        "From date cannot be after to date",
        400,
        "INVALID_DATE_RANGE"
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
        "This leave type is inactive",
        400,
        "INACTIVE_LEAVE_TYPE"
      );
    }

    /*
     * Check minimum notice.
     */
    const now = new Date();

    const noticeMilliseconds =
      data.fromDate.getTime() -
      now.getTime();

    const noticeDays =
      Math.ceil(
        noticeMilliseconds /
          (1000 * 60 * 60 * 24)
      );

    if (
      noticeDays <
      leaveType.rules.minNoticeDays
    ) {
      throw new AppError(
        `Leave must be requested at least ${leaveType.rules.minNoticeDays} day(s) in advance`,
        400,
        "INSUFFICIENT_NOTICE"
      );
    }

    /*
     * Calculate working leave days considering timezone, weekends, and holidays.
     */
    const days =
      await calculateLeaveDays(
        data.fromDate,
        data.toDate,
        leaveType.rules.excludeWeekends,
        leaveType.rules.excludeMandatoryHolidays,
        employee.timezone || "Asia/Kolkata"
      );

    if (days <= 0) {
      throw new AppError(
        "Leave request contains no eligible leave days",
        400,
        "INVALID_LEAVE_DAYS"
      );
    }

    /*
     * Maximum consecutive days.
     */
    if (
      days >
      leaveType.rules.maxConsecutiveDays
    ) {
      throw new AppError(
        `Leave cannot exceed ${leaveType.rules.maxConsecutiveDays} days`,
        400,
        "MAX_CONSECUTIVE_DAYS_EXCEEDED"
      );
    }

    /*
     * Check overlapping requests.
     */
    const overlapping =
      await findOverlappingLeave(
        data.employeeId,
        data.fromDate,
        data.toDate
      );

    if (overlapping.length > 0) {
      throw new AppError(
        "Leave request overlaps with an existing pending or approved leave",
        409,
        "LEAVE_OVERLAP"
      );
    }

    /*
     * Check balance.
     */
    const year =
      data.fromDate.getFullYear();

    const balance =
      await findBalance(
        data.employeeId,
        data.leaveTypeId,
        year
      );

    if (!balance) {
      throw new AppError(
        "Leave balance not found for this employee and leave type",
        404,
        "LEAVE_BALANCE_NOT_FOUND"
      );
    }

    if (
      !leaveType.rules
        .allowNegativeBalance &&
      balance.available < days
    ) {
      throw new AppError(
        "Insufficient leave balance",
        400,
        "INSUFFICIENT_LEAVE_BALANCE"
      );
    }

    /*
     * Create request.
     * Balance is NOT reduced here; it changes only after approval.
     */
    const createdRequest = await createLeaveRequest({
      employeeId:
        new Types.ObjectId(
          data.employeeId
        ),

      leaveTypeId:
        new Types.ObjectId(
          data.leaveTypeId
        ),

      fromDate: data.fromDate,

      toDate: data.toDate,

      days,

      reason: data.reason,

      status: "PENDING",
    });

    await logAuditEvent({
      actorId: data.employeeId,
      action: "LEAVE_CREATED",
      entityType: "LEAVE_REQUEST",
      entityId: createdRequest._id.toString(),
      newValue: createdRequest,
      metadata: {
        days,
        fromDate: data.fromDate,
        toDate: data.toDate,
        leaveTypeId: data.leaveTypeId,
      },
    });

    await notificationService.notifyLeaveCreated(createdRequest, employee);

    return createdRequest;
  };

export const getEmployeeLeaveRequestsService =
  async (
    employeeId: string
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

    return findEmployeeLeaveRequests(
      employeeId
    );
  };

export const getPendingLeaveRequestsService =
  async () => {
    return findPendingLeaveRequests();
  };

export const approveLeaveRequestService =
  async (
    requestId: string,
    approverId: string
  ) => {
    if (
      !Types.ObjectId.isValid(
        requestId
      )
    ) {
      throw new AppError(
        "Invalid leave request ID",
        400,
        "INVALID_LEAVE_REQUEST_ID"
      );
    }

    if (
      !Types.ObjectId.isValid(
        approverId
      )
    ) {
      throw new AppError(
        "Invalid approver ID",
        400,
        "INVALID_APPROVER_ID"
      );
    }

    const request =
      await findLeaveRequestById(
        requestId
      );

    if (!request) {
      throw new AppError(
        "Leave request not found",
        404,
        "LEAVE_REQUEST_NOT_FOUND"
      );
    }

    if (
      request.status !== "PENDING"
    ) {
      throw new AppError(
        "Only pending leave requests can be approved",
        400,
        "INVALID_LEAVE_REQUEST_STATUS"
      );
    }

    const employeeIdStr =
      (request.employeeId as any)?._id
        ? (request.employeeId as any)._id.toString()
        : request.employeeId.toString();

    // Prevent self-approval
    if (employeeIdStr === approverId) {
      throw new AppError(
        "You cannot approve your own leave request",
        403,
        "CANNOT_APPROVE_OWN_LEAVE"
      );
    }

    const employee =
      await Employee.findById(
        employeeIdStr
      );

    if (!employee) {
      throw new AppError(
        "Employee not found",
        404,
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const approver =
      await Employee.findById(
        approverId
      );

    if (!approver) {
      throw new AppError(
        "Approver not found",
        404,
        "APPROVER_NOT_FOUND"
      );
    }

    const isHR =
      approver.role === "HR" ||
      approver.role === "ADMIN";

    const isManager =
      employee.managerId &&
      employee.managerId.toString() ===
        approverId;

    if (
      !isHR &&
      !isManager
    ) {
      throw new AppError(
        "You are not authorized to approve this leave request",
        403,
        "NOT_AUTHORIZED_TO_APPROVE"
      );
    }

    const leaveTypeIdStr =
      (request.leaveTypeId as any)?._id
        ? (request.leaveTypeId as any)._id.toString()
        : request.leaveTypeId.toString();

    const leaveType = await LeaveType.findById(leaveTypeIdStr);
    if (!leaveType) {
      throw new AppError(
        "Leave type not found",
        404,
        "LEAVE_TYPE_NOT_FOUND"
      );
    }

    /*
     * Re-verify balance immediately before approval.
     */
    const balance =
      await findBalance(
        employeeIdStr,
        leaveTypeIdStr,
        request.fromDate.getFullYear()
      );

    if (!balance) {
      throw new AppError(
        "Leave balance not found",
        404,
        "LEAVE_BALANCE_NOT_FOUND"
      );
    }

    if (
      !leaveType.rules.allowNegativeBalance &&
      balance.available < request.days
    ) {
      throw new AppError(
        "Insufficient leave balance at approval time",
        400,
        "INSUFFICIENT_LEAVE_BALANCE"
      );
    }

    /*
     * Deduct balance atomically.
     */
    const updatedBalance =
      await deductBalance(
        balance._id.toString(),
        request.days
      );

    if (!updatedBalance) {
      throw new AppError(
        "Failed to update leave balance",
        500,
        "BALANCE_UPDATE_FAILED"
      );
    }

    /*
     * Approve request.
     */
    const approved = await updateLeaveRequest(
      requestId,
      {
        status: "APPROVED",
        approvedBy:
          new Types.ObjectId(
            approverId
          ),
        approvedAt: new Date(),
      }
    );

    await logAuditEvent({
      actorId: approverId,
      action: "LEAVE_APPROVED",
      entityType: "LEAVE_REQUEST",
      entityId: requestId,
      oldValue: { status: "PENDING" },
      newValue: { status: "APPROVED", approvedBy: approverId, approvedAt: new Date() },
      metadata: { days: request.days, employeeId: employeeIdStr },
    });

    await notificationService.notifyLeaveApproved(approved, employee, approver);

    return approved;
  };

export const rejectLeaveRequestService =
  async (
    requestId: string,
    approverId: string,
    rejectionReason: string
  ) => {
    if (
      !Types.ObjectId.isValid(
        requestId
      )
    ) {
      throw new AppError(
        "Invalid leave request ID",
        400,
        "INVALID_LEAVE_REQUEST_ID"
      );
    }

    if (
      !Types.ObjectId.isValid(
        approverId
      )
    ) {
      throw new AppError(
        "Invalid approver ID",
        400,
        "INVALID_APPROVER_ID"
      );
    }

    const request =
      await findLeaveRequestById(
        requestId
      );

    if (!request) {
      throw new AppError(
        "Leave request not found",
        404,
        "LEAVE_REQUEST_NOT_FOUND"
      );
    }

    if (
      request.status !== "PENDING"
    ) {
      throw new AppError(
        "Only pending leave requests can be rejected",
        400,
        "INVALID_LEAVE_REQUEST_STATUS"
      );
    }

    const employeeIdStr =
      (request.employeeId as any)?._id
        ? (request.employeeId as any)._id.toString()
        : request.employeeId.toString();

    // Prevent self-rejection
    if (employeeIdStr === approverId) {
      throw new AppError(
        "You cannot reject your own leave request",
        403,
        "CANNOT_REJECT_OWN_LEAVE"
      );
    }

    const employee =
      await Employee.findById(
        employeeIdStr
      );

    const approver =
      await Employee.findById(
        approverId
      );

    if (
      !employee ||
      !approver
    ) {
      throw new AppError(
        "Employee or approver not found",
        404,
        "EMPLOYEE_OR_APPROVER_NOT_FOUND"
      );
    }

    const isHR =
      approver.role === "HR" ||
      approver.role === "ADMIN";

    const isManager =
      employee.managerId &&
      employee.managerId.toString() ===
        approverId;

    if (
      !isHR &&
      !isManager
    ) {
      throw new AppError(
        "You are not authorized to reject this leave request",
        403,
        "NOT_AUTHORIZED_TO_REJECT"
      );
    }

    const rejected = await updateLeaveRequest(
      requestId,
      {
        status: "REJECTED",
        approvedBy:
          new Types.ObjectId(
            approverId
          ),
        rejectionReason,
      }
    );

    await logAuditEvent({
      actorId: approverId,
      action: "LEAVE_REJECTED",
      entityType: "LEAVE_REQUEST",
      entityId: requestId,
      oldValue: { status: "PENDING" },
      newValue: { status: "REJECTED", approvedBy: approverId, rejectionReason },
      metadata: { employeeId: employeeIdStr, rejectionReason },
    });

    await notificationService.notifyLeaveRejected(rejected, employee, approver, rejectionReason);

    return rejected;
  };

export const cancelLeaveRequestService =
  async (
    requestId: string,
    userId: string,
    userRole: string
  ) => {
    if (
      !Types.ObjectId.isValid(
        requestId
      )
    ) {
      throw new AppError(
        "Invalid leave request ID",
        400,
        "INVALID_LEAVE_REQUEST_ID"
      );
    }

    if (
      !Types.ObjectId.isValid(
        userId
      )
    ) {
      throw new AppError(
        "Invalid user ID",
        400,
        "INVALID_USER_ID"
      );
    }

    const request =
      await findLeaveRequestById(
        requestId
      );

    if (!request) {
      throw new AppError(
        "Leave request not found",
        404,
        "LEAVE_REQUEST_NOT_FOUND"
      );
    }

    const employeeIdStr =
      (request.employeeId as any)?._id
        ? (request.employeeId as any)._id.toString()
        : request.employeeId.toString();

    const isOwner = employeeIdStr === userId;
    const isPrivileged = userRole === "HR" || userRole === "ADMIN";

    if (!isOwner && !isPrivileged) {
      throw new AppError(
        "You are not authorized to cancel this leave request",
        403,
        "NOT_AUTHORIZED_TO_CANCEL"
      );
    }

    if (
      request.status !== "PENDING" &&
      request.status !== "APPROVED"
    ) {
      throw new AppError(
        `Cannot cancel a leave request with status ${request.status}`,
        400,
        "INVALID_LEAVE_REQUEST_STATUS"
      );
    }

    const leaveTypeIdStr =
      (request.leaveTypeId as any)?._id
        ? (request.leaveTypeId as any)._id.toString()
        : request.leaveTypeId.toString();

    const leaveType = await LeaveType.findById(leaveTypeIdStr);
    if (!leaveType) {
      throw new AppError(
        "Leave type not found",
        404,
        "LEAVE_TYPE_NOT_FOUND"
      );
    }

    if (!leaveType.rules.allowCancellation) {
      throw new AppError(
        "Cancellation is not permitted for this leave type policy",
        400,
        "CANCELLATION_NOT_ALLOWED"
      );
    }

    const employee = await Employee.findById(employeeIdStr);

    // If request was approved, restore the consumed balance
    if (request.status === "APPROVED") {
      const balance = await findBalance(
        employeeIdStr,
        leaveTypeIdStr,
        request.fromDate.getFullYear()
      );

      if (balance) {
        await restoreBalance(
          balance._id.toString(),
          request.days
        );
      }
    }

    const cancelled = await updateLeaveRequest(
      requestId,
      {
        status: "CANCELLED",
        cancelledAt: new Date(),
      }
    );

    await logAuditEvent({
      actorId: userId,
      action: "LEAVE_CANCELLED",
      entityType: "LEAVE_REQUEST",
      entityId: requestId,
      oldValue: { status: request.status },
      newValue: { status: "CANCELLED", cancelledAt: new Date() },
      metadata: {
        employeeId: employeeIdStr,
        restoredDays: request.status === "APPROVED" ? request.days : 0,
      },
    });

    if (employee) {
      await notificationService.notifyLeaveCancelled(cancelled, employee, { _id: userId });
    }

    return cancelled;
  };