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
  findBalance,
  updateBalance,
} from "../repositories/leave-balance.repository";

import { calculateLeaveDays } from "./leave-day.service";

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
     * Calculate working leave days.
     */
    const days =
      await calculateLeaveDays(
        data.fromDate,
        data.toDate,
        leaveType.rules
          .excludeWeekends,
        leaveType.rules
          .excludeMandatoryHolidays
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
     *
     * IMPORTANT:
     * Balance is NOT reduced here.
     *
     * Balance changes only after approval.
     */
    return createLeaveRequest({
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

    const employee =
      await Employee.findById(
        request.employeeId
      );

    if (!employee) {
      throw new AppError(
        "Employee not found",
        404,
        "EMPLOYEE_NOT_FOUND"
      );
    }

    /*
     * Only the employee's manager or HR/Admin
     * should approve.
     *
     * Your Employee role definitions may differ.
     * Adjust ADMIN/HR values if necessary.
     */
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

    /*
     * Find balance again immediately before approval.
     *
     * We do this because the balance could have
     * changed after the employee submitted the request.
     */
    const balance =
      await findBalance(
        request.employeeId.toString(),
        request.leaveTypeId.toString(),
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
      balance.available <
      request.days
    ) {
      throw new AppError(
        "Insufficient leave balance at approval time",
        400,
        "INSUFFICIENT_LEAVE_BALANCE"
      );
    }

    /*
     * Update balance.
     */
    const updatedBalance =
      await updateBalance(
        balance._id.toString(),
        {
          used:
            balance.used +
            request.days,

          available:
            balance.available -
            request.days,
        }
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
    return updateLeaveRequest(
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
  };

export const rejectLeaveRequestService =
  async (
    requestId: string,
    approverId: string,
    rejectionReason: string
  ) => {
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

    const employee =
      await Employee.findById(
        request.employeeId
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

    return updateLeaveRequest(
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
  };