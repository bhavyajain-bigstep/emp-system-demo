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
      .limit(limit)
      .lean() as unknown as Promise<IAttendance[]>,

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
  })
    .sort({ date: 1 })
    .lean() as unknown as Promise<IAttendance[]>;
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

export const findAttendanceReportPage = async (
  filter: Record<string, unknown>,
  skip: number,
  limit: number
) => {
  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate({
        path: "employeeId",
        select: "employeeCode name email role departmentId managerId",
        populate: { path: "departmentId", select: "name" },
      })
      .sort({ date: -1, checkInAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as unknown as Promise<IAttendance[]>,

    Attendance.countDocuments(filter),
  ]);

  return { records, total };
};