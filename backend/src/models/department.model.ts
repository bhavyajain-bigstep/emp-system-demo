import { Document, Schema, Types, model } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  managerId?: Types.ObjectId;
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
  },
  {
    timestamps: true,
  },
);

export const Department = model<IDepartment>("Department", departmentSchema);
