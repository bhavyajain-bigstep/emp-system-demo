import {
  Document,
  Model,
  Schema,
  Types,
  model,
} from "mongoose";

export interface ILeaveBalance extends Document {
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;

  year: number;

  allocated: number;
  used: number;
  available: number;

  createdAt: Date;
  updatedAt: Date;
}

const leaveBalanceSchema =
  new Schema<ILeaveBalance>(
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

      year: {
        type: Number,
        required: true,
        index: true,
      },

      allocated: {
        type: Number,
        required: true,
        min: 0,
      },

      used: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      available: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * An employee can have only one balance
 * for a particular leave type in a particular year.
 *
 * Example:
 *
 * Employee A + Annual Leave + 2026
 * Employee A + Annual Leave + 2026  ❌
 */
leaveBalanceSchema.index(
  {
    employeeId: 1,
    leaveTypeId: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

/*
 * available should always equal:
 *
 * allocated - used
 */
leaveBalanceSchema.pre(
  "validate",
  function (next) {
    this.available =
      this.allocated - this.used;

    if (this.available < 0) {
      this.invalidate(
        "available",
        "Available balance cannot be negative"
      );
    }

    next();
  }
);

export const LeaveBalance =
  model<ILeaveBalance>(
    "LeaveBalance",
    leaveBalanceSchema
  );