import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface INotificationService {
  notifyLeaveCreated(leaveRequest: any, employee: any): Promise<void>;
  notifyLeaveApproved(leaveRequest: any, employee: any, approver: any): Promise<void>;
  notifyLeaveRejected(leaveRequest: any, employee: any, approver: any, reason?: string): Promise<void>;
  notifyLeaveCancelled(leaveRequest: any, employee: any, cancelledBy?: any): Promise<void>;
}

export class ConsoleNotificationService implements INotificationService {
  private logIfNotTest(message: string): void {
    if (env.NODE_ENV !== "test") {
      logger.info(message);
    }
  }

  async notifyLeaveCreated(leaveRequest: any, employee: any): Promise<void> {
    this.logIfNotTest(
      `[NOTIFICATION] Leave request submitted: Employee ${employee?.name || employee?._id} requested ${leaveRequest?.days} day(s) from ${leaveRequest?.fromDate} to ${leaveRequest?.toDate}`
    );
  }

  async notifyLeaveApproved(leaveRequest: any, employee: any, approver: any): Promise<void> {
    this.logIfNotTest(
      `[NOTIFICATION] Leave request approved: Request ${leaveRequest?._id} for ${employee?.name || employee?._id} approved by ${approver?.name || approver?._id}`
    );
  }

  async notifyLeaveRejected(leaveRequest: any, employee: any, approver: any, reason?: string): Promise<void> {
    this.logIfNotTest(
      `[NOTIFICATION] Leave request rejected: Request ${leaveRequest?._id} for ${employee?.name || employee?._id} rejected by ${approver?.name || approver?._id}. Reason: ${reason || "N/A"}`
    );
  }

  async notifyLeaveCancelled(leaveRequest: any, employee: any, cancelledBy?: any): Promise<void> {
    this.logIfNotTest(
      `[NOTIFICATION] Leave request cancelled: Request ${leaveRequest?._id} for ${employee?.name || employee?._id} was cancelled by ${cancelledBy?.name || cancelledBy?._id || "Employee"}`
    );
  }
}

export const notificationService: INotificationService = new ConsoleNotificationService();
