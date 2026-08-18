import { Schema, model, Document, Types } from "mongoose";

export type DepartmentStatus = "ACTIVE" | "ARCHIVED";

export interface IDepartment extends Document {
  name: string;
  managerId?: Types.ObjectId;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    managerId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

departmentSchema.index({ managerId: 1 });

export const Department = model<IDepartment>(
  "Department",
  departmentSchema
);