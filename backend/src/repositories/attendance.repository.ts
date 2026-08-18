import { Attendance, IAttendance } from "../models/attendance.model";

export const findAttendanceByEmployeeAndDate = async (
  employeeId: string,
  date: string
): Promise<IAttendance | null> => {
  return Attendance.findOne({ employeeId, date });
};

export const findAttendanceRecords = async (
  filter: Record<string, unknown>,
  skip: number,
  limit: number
) => {
  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate("employeeId", "name employeeCode")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),

    Attendance.countDocuments(filter),
  ]);

  return { records, total };
};

export const findAttendanceInRange = async (
  employeeId: string,
  fromDate: string,
  toDate: string
): Promise<IAttendance[]> => {
  return Attendance.find({
    employeeId,
    date: { $gte: fromDate, $lte: toDate },
  }).sort({ date: 1 });
};

export const createAttendance = async (
  data: Partial<IAttendance>
): Promise<IAttendance> => {
  return Attendance.create(data);
};

export const updateAttendance = async (
  id: string,
  data: Partial<IAttendance>
): Promise<IAttendance | null> => {
  return Attendance.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};