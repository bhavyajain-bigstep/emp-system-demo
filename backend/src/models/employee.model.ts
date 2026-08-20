import {
  Document,
  Schema,
  Types,
  model,
} from "mongoose";

export type EmployeeRole =
  | "EMPLOYEE"
  | "MANAGER"
  | "HR"
  | "ADMIN";

export type EmployeeStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export interface IEmployee
  extends Document {
  employeeCode: string;

  name: string;

  email: string;

  passwordHash: string;

  role: EmployeeRole;

  managerId?: Types.ObjectId;

  departmentId?: Types.ObjectId;

  joiningDate: Date;

  timezone: string;

  status: EmployeeStatus;

  refreshTokenHash?: string;

  createdAt: Date;

  updatedAt: Date;
}

const employeeSchema =
  new Schema<IEmployee>(
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
        enum: [
          "EMPLOYEE",
          "MANAGER",
          "HR",
          "ADMIN",
        ],
        required: true,
      },

      managerId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
      },

      departmentId: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        required: true,
      },

      joiningDate: {
        type: Date,
        required: true,
      },

      timezone: {
        type: String,
        required: true,
        default: "Asia/Kolkata",
      },

      status: {
        type: String,
        enum: [
          "ACTIVE",
          "INACTIVE",
          "SUSPENDED",
        ],
        default: "ACTIVE",
      },

      refreshTokenHash: {
        type: String,
        select: false,
      },
    },
    {
      timestamps: true,
    }
  );

employeeSchema.index({
  departmentId: 1,
});

employeeSchema.index({
  managerId: 1,
});

employeeSchema.index({
  status: 1,
});

export const Employee =
  model<IEmployee>(
    "Employee",
    employeeSchema
  );