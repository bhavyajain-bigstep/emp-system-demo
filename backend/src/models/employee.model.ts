import { Schema, model, Document, Types } from "mongoose";

export type EmployeeRole =
  | "EMPLOYEE"
  | "MANAGER"
  | "HR"
  | "ADMIN";

export type EmployeeStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export interface IEmployee extends Document {
  employeeCode: string;
  name: string;
  email: string;
  passwordHash: string;
  role: EmployeeRole;
  managerId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  joiningDate: Date;
  status: EmployeeStatus;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"],
      default: "EMPLOYEE",
      required: true,
    },

    managerId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },

    joiningDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      required: true,
    },

    timezone: {
      type: String,
      required: true,
      default: "Asia/Kolkata",
    },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ managerId: 1 });
employeeSchema.index({ departmentId: 1, status: 1 });

export const Employee = model<IEmployee>(
  "Employee",
  employeeSchema
);