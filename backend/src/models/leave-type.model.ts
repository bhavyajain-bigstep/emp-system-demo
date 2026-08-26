import { Document, Schema, model } from "mongoose";

export interface ILeaveRules {
  allowNegativeBalance: boolean;
  excludeWeekends: boolean;
  excludeMandatoryHolidays: boolean;
  allowHalfDay: boolean;
  allowCancellation: boolean;
  maxConsecutiveDays: number;
  minNoticeDays: number;
}

export interface ILeaveType extends Document {
  name: string;
  code: string;
  annualQuota: number;
  rules: ILeaveRules;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

const leaveRulesSchema = new Schema<ILeaveRules>(
  {
    allowNegativeBalance: {
      type: Boolean,
      default: false,
    },

    excludeWeekends: {
      type: Boolean,
      default: true,
    },

    excludeMandatoryHolidays: {
      type: Boolean,
      default: true,
    },

    allowHalfDay: {
      type: Boolean,
      default: false,
    },

    allowCancellation: {
      type: Boolean,
      default: true,
    },

    maxConsecutiveDays: {
      type: Number,
      required: true,
      min: 1,
    },

    minNoticeDays: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const leaveTypeSchema = new Schema<ILeaveType>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },

    annualQuota: {
      type: Number,
      required: true,
      min: 0,
    },

    rules: {
      type: leaveRulesSchema,
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  },
);

export const LeaveType = model<ILeaveType>("LeaveType", leaveTypeSchema);
