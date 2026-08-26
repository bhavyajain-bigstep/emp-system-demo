import { Schema, model, Document, Types } from "mongoose";

export type AttendanceStatus =
  | "PRESENT"
  | "LATE"
  | "HALF_DAY"
  | "ABSENT"
  | "LEAVE";

export interface IAttendance extends Document {
  employeeId: Types.ObjectId;
  date: string; // "YYYY-MM-DD" — employee's LOCAL calendar date, not UTC
  checkInAt: Date;
  checkOutAt?: Date;
  status: AttendanceStatus;
  timezone: string; // snapshot of employee's timezone at check-in
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    checkInAt: {
      type: Date,
      required: true,
    },

    checkOutAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["PRESENT", "LATE", "HALF_DAY", "ABSENT", "LEAVE"],
      required: true,
    },

    timezone: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// One attendance record per employee per local calendar day — this is what
// actually enforces "no duplicate check-ins for the same day" at the DB level.
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const Attendance = model<IAttendance>("Attendance", attendanceSchema);
