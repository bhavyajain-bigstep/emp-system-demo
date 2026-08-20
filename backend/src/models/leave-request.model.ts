import {
  Document,
  Schema,
  Types,
  model,
} from "mongoose";

export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface ILeaveRequest
  extends Document {
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;

  fromDate: Date;
  toDate: Date;

  days: number;

  reason: string;

  status: LeaveRequestStatus;

  approvedBy?: Types.ObjectId;
  approvedAt?: Date;

  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;

  rejectionReason?: string;

  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema =
  new Schema<ILeaveRequest>(
    {
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
      },

      leaveTypeId: {
        type: Schema.Types.ObjectId,
        ref: "LeaveType",
        required: true,
        index: true,
      },

      fromDate: {
        type: Date,
        required: true,
        index: true,
      },

      toDate: {
        type: Date,
        required: true,
        index: true,
      },

      days: {
        type: Number,
        required: true,
        min: 0.5,
      },

      reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },

      status: {
        type: String,
        enum: [
          "PENDING",
          "APPROVED",
          "REJECTED",
          "CANCELLED",
        ],
        default: "PENDING",
        index: true,
      },

      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
      },

      approvedAt: {
        type: Date,
      },

      rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
      },

      rejectedAt: {
        type: Date,
      },

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      cancelledAt: {
        type: Date,
      },

      cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
      },
    },
    {
      timestamps: true,
    }
  );

leaveRequestSchema.index({
  employeeId: 1,
  fromDate: 1,
  toDate: 1,
});

leaveRequestSchema.index({
  status: 1,
  fromDate: 1,
});

export const LeaveRequest =
  model<ILeaveRequest>(
    "LeaveRequest",
    leaveRequestSchema
  );