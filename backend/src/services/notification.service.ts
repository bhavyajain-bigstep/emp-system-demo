export interface INotificationService {
  notifyLeaveCreated(leaveRequest: any, employee: any): Promise<void>;
  notifyLeaveApproved(leaveRequest: any, employee: any, approver: any): Promise<void>;
  notifyLeaveRejected(leaveRequest: any, employee: any, approver: any, reason?: string): Promise<void>;
  notifyLeaveCancelled(leaveRequest: any, employee: any, cancelledBy?: any): Promise<void>;
}

export class ConsoleNotificationService implements INotificationService {
  async notifyLeaveCreated(leaveRequest: any, employee: any): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[NOTIFICATION] Leave request submitted: Employee ${employee?.name || employee?._id} requested ${leaveRequest?.days} day(s) from ${leaveRequest?.fromDate} to ${leaveRequest?.toDate}`
      );
    }
  }

  async notifyLeaveApproved(leaveRequest: any, employee: any, approver: any): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[NOTIFICATION] Leave request approved: Request ${leaveRequest?._id} for ${employee?.name || employee?._id} approved by ${approver?.name || approver?._id}`
      );
    }
  }

  async notifyLeaveRejected(leaveRequest: any, employee: any, approver: any, reason?: string): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[NOTIFICATION] Leave request rejected: Request ${leaveRequest?._id} for ${employee?.name || employee?._id} rejected by ${approver?.name || approver?._id}. Reason: ${reason || "N/A"}`
      );
    }
  }

  async notifyLeaveCancelled(leaveRequest: any, employee: any, cancelledBy?: any): Promise<void> {
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[NOTIFICATION] Leave request cancelled: Request ${leaveRequest?._id} for ${employee?.name || employee?._id} was cancelled by ${cancelledBy?.name || cancelledBy?._id || "Employee"}`
      );
    }
  }
}

export const notificationService: INotificationService = new ConsoleNotificationService();
