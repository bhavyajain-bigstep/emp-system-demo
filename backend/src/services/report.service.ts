import { Types } from "mongoose";
import { Attendance, IAttendance } from "../models/attendance.model";
import { LeaveRequest, ILeaveRequest } from "../models/leave-request.model";
import { Employee } from "../models/employee.model";
import { Holiday } from "../models/holiday.model";
import { AppError } from "../errors/app-error";
import { stringify } from "csv-stringify/sync";
import { env } from "../config/env";
import { getLocalDateString } from "../utils/timezone.util";

export interface AttendanceReportFilter {
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  employeeId?: string;
  departmentId?: string;
  status?: string;
}

export interface LeaveReportFilter {
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  employeeId?: string;
  departmentId?: string;
  leaveTypeId?: string;
  status?: string;
}

export interface AuthContext {
  userId: string;
  role: string;
}

const buildAuthorizedEmployeeFilter = async (
  requestedEmployeeId?: string,
  requestedDepartmentId?: string,
  auth?: AuthContext
): Promise<Record<string, any>> => {
  const empFilter: Record<string, any> = {};

  if (auth?.role === "EMPLOYEE") {
    empFilter._id = new Types.ObjectId(auth.userId);
    return empFilter;
  }

  if (auth?.role === "MANAGER") {
    // Manager can view themselves and direct reports
    const teamMembers = await Employee.find({
      $or: [{ managerId: auth.userId }, { _id: auth.userId }],
    }).select("_id");
    const allowedIds = teamMembers.map((t) => t._id);

    if (requestedEmployeeId) {
      if (!allowedIds.some((id) => id.toString() === requestedEmployeeId)) {
        throw new AppError("You can only access reports for your team", 403, "FORBIDDEN");
      }
      empFilter._id = new Types.ObjectId(requestedEmployeeId);
    } else {
      empFilter._id = { $in: allowedIds };
    }

    if (requestedDepartmentId) {
      empFilter.departmentId = new Types.ObjectId(requestedDepartmentId);
    }
    return empFilter;
  }

  // HR / ADMIN
  if (requestedEmployeeId) {
    empFilter._id = new Types.ObjectId(requestedEmployeeId);
  }
  if (requestedDepartmentId) {
    empFilter.departmentId = new Types.ObjectId(requestedDepartmentId);
  }

  return empFilter;
};

export const getAttendanceReportService = async (
  filter: AttendanceReportFilter,
  page = 1,
  limit = 20,
  auth?: AuthContext
) => {
  const from = filter.from || filter.startDate;
  const to = filter.to || filter.endDate;

  const empFilter = await buildAuthorizedEmployeeFilter(
    filter.employeeId,
    filter.departmentId,
    auth
  );

  let targetEmployeeIds: Types.ObjectId[] | null = null;
  if (Object.keys(empFilter).length > 0) {
    const matchedEmployees = await Employee.find(empFilter).select("_id");
    targetEmployeeIds = matchedEmployees.map((e) => e._id as Types.ObjectId);
  }

  const attendanceQuery: Record<string, any> = {};

  if (targetEmployeeIds !== null) {
    attendanceQuery.employeeId = { $in: targetEmployeeIds };
  }

  if (filter.status) {
    attendanceQuery.status = filter.status;
  }

  if (from || to) {
    attendanceQuery.date = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    Attendance.find(attendanceQuery)
      .populate({
        path: "employeeId",
        select: "employeeCode name email role departmentId managerId",
        populate: { path: "departmentId", select: "name" },
      })
      .sort({ date: -1, checkInAt: -1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(attendanceQuery),
  ]);

  const formattedData = records.map((record) => {
    const checkIn = record.checkInAt ? new Date(record.checkInAt) : null;
    const checkOut = record.checkOutAt ? new Date(record.checkOutAt) : null;

    let workingHours = 0;
    let workingMinutes = 0;
    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      workingMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      workingHours = Number((workingMinutes / 60).toFixed(2));
    }

    return {
      _id: record._id,
      date: record.date,
      status: record.status,
      checkInAt: record.checkInAt,
      checkOutAt: record.checkOutAt,
      workingHours,
      workingMinutes,
      isLate: record.status === "LATE",
      timezone: record.timezone,
      employee: record.employeeId,
    };
  });

  return {
    records: formattedData,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const exportAttendanceReportCsv = async (
  filter: AttendanceReportFilter,
  auth?: AuthContext
): Promise<string> => {
  const result = await getAttendanceReportService(filter, 1, 10000, auth);

  const rows = result.records.map((r) => {
    const emp = r.employee as any;
    return {
      "Employee Code": emp?.employeeCode || "",
      "Employee Name": emp?.name || "",
      "Department": emp?.departmentId?.name || "",
      "Date": r.date,
      "Status": r.status,
      "Check-In Time": r.checkInAt ? new Date(r.checkInAt).toISOString() : "",
      "Check-Out Time": r.checkOutAt ? new Date(r.checkOutAt).toISOString() : "",
      "Working Hours": r.workingHours,
      "Working Minutes": r.workingMinutes,
      "Late": r.isLate ? "YES" : "NO",
      "Timezone": r.timezone || "",
    };
  });

  return stringify(rows, { header: true });
};

export const getLeaveReportService = async (
  filter: LeaveReportFilter,
  page = 1,
  limit = 20,
  auth?: AuthContext
) => {
  const from = filter.from || filter.startDate;
  const to = filter.to || filter.endDate;

  const empFilter = await buildAuthorizedEmployeeFilter(
    filter.employeeId,
    filter.departmentId,
    auth
  );

  let targetEmployeeIds: Types.ObjectId[] | null = null;
  if (Object.keys(empFilter).length > 0) {
    const matchedEmployees = await Employee.find(empFilter).select("_id");
    targetEmployeeIds = matchedEmployees.map((e) => e._id as Types.ObjectId);
  }

  const leaveQuery: Record<string, any> = {};

  if (targetEmployeeIds !== null) {
    leaveQuery.employeeId = { $in: targetEmployeeIds };
  }

  if (filter.status) {
    leaveQuery.status = filter.status;
  }

  if (filter.leaveTypeId) {
    leaveQuery.leaveTypeId = new Types.ObjectId(filter.leaveTypeId);
  }

  if (from || to) {
    if (from && to) {
      leaveQuery.fromDate = { $lte: new Date(to) };
      leaveQuery.toDate = { $gte: new Date(from) };
    } else if (from) {
      leaveQuery.toDate = { $gte: new Date(from) };
    } else if (to) {
      leaveQuery.fromDate = { $lte: new Date(to) };
    }
  }

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    LeaveRequest.find(leaveQuery)
      .populate({
        path: "employeeId",
        select: "employeeCode name email role departmentId managerId",
        populate: { path: "departmentId", select: "name" },
      })
      .populate("leaveTypeId", "name code annualQuota rules")
      .populate("approvedBy", "employeeCode name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    LeaveRequest.countDocuments(leaveQuery),
  ]);

  return {
    records,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const exportLeaveReportCsv = async (
  filter: LeaveReportFilter,
  auth?: AuthContext
): Promise<string> => {
  const result = await getLeaveReportService(filter, 1, 10000, auth);

  const rows = result.records.map((r: any) => {
    return {
      "Leave ID": r._id.toString(),
      "Employee Code": r.employeeId?.employeeCode || "",
      "Employee Name": r.employeeId?.name || "",
      "Department": r.employeeId?.departmentId?.name || "",
      "Leave Type": r.leaveTypeId?.name || "",
      "From Date": r.fromDate ? new Date(r.fromDate).toISOString().split("T")[0] : "",
      "To Date": r.toDate ? new Date(r.toDate).toISOString().split("T")[0] : "",
      "Days": r.days,
      "Status": r.status,
      "Reason": r.reason || "",
      "Approved / Action By": r.approvedBy?.name || "",
      "Approved At": r.approvedAt ? new Date(r.approvedAt).toISOString() : "",
      "Rejection Reason": r.rejectionReason || "",
      "Cancelled At": r.cancelledAt ? new Date(r.cancelledAt).toISOString() : "",
      "Created At": r.createdAt ? new Date(r.createdAt).toISOString() : "",
    };
  });

  return stringify(rows, { header: true });
};

export const getDashboardSummaryService = async (
  auth?: AuthContext
) => {
  const empFilter = await buildAuthorizedEmployeeFilter(undefined, undefined, auth);

  let targetEmployeeIds: Types.ObjectId[] | null = null;
  if (Object.keys(empFilter).length > 0) {
    const matchedEmployees = await Employee.find(empFilter).select("_id timezone");
    targetEmployeeIds = matchedEmployees.map((e) => e._id as Types.ObjectId);
    
    // Build timezone map for employees
    const timezoneMap = new Map<string, string>();
    matchedEmployees.forEach((e) => {
      timezoneMap.set(e._id.toString(), e.timezone);
    });
  }

  const employeeQuery: Record<string, any> = {};
  const leaveQuery: Record<string, any> = {};
  const attendanceQuery: Record<string, any> = {};

  if (targetEmployeeIds !== null) {
    employeeQuery._id = { $in: targetEmployeeIds };
    leaveQuery.employeeId = { $in: targetEmployeeIds };
    attendanceQuery.employeeId = { $in: targetEmployeeIds };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Fetch employees to get their timezones
  const employees = targetEmployeeIds !== null 
    ? await Employee.find({ _id: { $in: targetEmployeeIds } }).select("_id timezone")
    : await Employee.find(employeeQuery).select("_id timezone");
  
  const timezoneMap = new Map<string, string>();
  employees.forEach((e) => timezoneMap.set(e._id.toString(), e.timezone));

  // Determine today's date in each employee's timezone
  const employeeDateMap = new Map<string, string>();
  for (const [empId, tz] of timezoneMap.entries()) {
    employeeDateMap.set(empId, getLocalDateString(now, tz));
  }

  // Get unique dates for today across all timezones
  const todayDates = Array.from(new Set(employeeDateMap.values()));

  // Check if today is a weekend or holiday for each date
  const weekendDays = env.ATTENDANCE_WEEKEND_DAYS
    ? env.ATTENDANCE_WEEKEND_DAYS.split(",").map(Number)
    : [0, 6];

  const isWeekend = (dateStr: string) => {
    const dayOfWeek = new Date(Date.UTC(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10))
    )).getUTCDay();
    return weekendDays.includes(dayOfWeek);
  };

  // Fetch mandatory holidays for today's dates
  const holidayQuery = {
    date: { $in: todayDates.map(d => new Date(`${d}T00:00:00.000Z`)) },
    optional: false,
  };
  const holidays = await Holiday.find(holidayQuery).select("date");
  const holidayDates = new Set(holidays.map(h => getLocalDateString(h.date, "UTC")));

  // Fetch approved leaves for today's dates
  const leaveQueryToday = {
    employeeId: { $in: targetEmployeeIds || [] },
    status: "APPROVED",
    fromDate: { $lte: new Date(todayDates[todayDates.length - 1] + "T23:59:59.999Z") },
    toDate: { $gte: new Date(todayDates[0] + "T00:00:00.000Z") },
  };
  const approvedLeaves = await LeaveRequest.find(leaveQueryToday).select("employeeId fromDate toDate");
  
  // Build a set of employee IDs on leave for each date
  const employeesOnLeave = new Map<string, Set<string>>(); // date -> Set of employeeIds
  for (const leave of approvedLeaves) {
    const from = getLocalDateString(new Date(leave.fromDate), "UTC");
    const to = getLocalDateString(new Date(leave.toDate), "UTC");
    // Simple iteration for date range (in practice, leaves are usually short)
    let current = from;
    while (current <= to) {
      if (!employeesOnLeave.has(current)) {
        employeesOnLeave.set(current, new Set());
      }
      employeesOnLeave.get(current)!.add(leave.employeeId.toString());
      // Increment date
      const date = new Date(`${current}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + 1);
      current = getLocalDateString(date, "UTC");
    }
  }

  // Fetch attendance for today
  const attendanceToday = await Attendance.find({
    ...attendanceQuery,
    date: { $in: todayDates },
  }).select("employeeId status");

  // Calculate attendance breakdown
  let present = 0;
  let late = 0;
  let halfDay = 0;
  let leave = 0;
  let notExpected = 0; // weekend, holiday, or on leave

  const attendanceByEmp = new Map<string, typeof attendanceToday[0]>();
  for (const a of attendanceToday) {
    attendanceByEmp.set(a.employeeId.toString(), a);
  }

  for (const [empId, tz] of timezoneMap.entries()) {
    const todayStr = employeeDateMap.get(empId)!;
    
    if (isWeekend(todayStr) || holidayDates.has(todayStr)) {
      notExpected++;
      continue;
    }
    
    if (employeesOnLeave.get(todayStr)?.has(empId)) {
      leave++;
      continue;
    }

    const attendance = attendanceByEmp.get(empId);
    if (attendance) {
      if (attendance.status === "PRESENT") present++;
      else if (attendance.status === "LATE") late++;
      else if (attendance.status === "HALF_DAY") halfDay++;
      else if (attendance.status === "LEAVE") leave++;
    }
  }

  const totalEmployees = timezoneMap.size;
  const absent = totalEmployees - present - late - halfDay - leave - notExpected;

  const attendanceBreakdown = {
    present,
    late,
    absent: Math.max(absent, 0),
    halfDay,
    leave,
    notExpected,
    total: totalEmployees,
  };

  const [totalEmployeesCount, activeEmployees, pendingLeaves, approvedThisMonth] = await Promise.all([
    Employee.countDocuments(employeeQuery),
    Employee.countDocuments({ ...employeeQuery, status: "ACTIVE" }),
    LeaveRequest.countDocuments({ ...leaveQuery, status: "PENDING" }),
    LeaveRequest.countDocuments({
      ...leaveQuery,
      status: "APPROVED",
      approvedAt: { $gte: startOfMonth },
    }),
  ]);

  const leavesByType = await LeaveRequest.aggregate([
    { $match: leaveQuery },
    { $group: { _id: "$leaveTypeId", count: { $sum: 1 } } },
  ]);

  return {
    asOf: now,
    employees: {
      total: totalEmployeesCount,
      active: activeEmployees,
      inactive: totalEmployeesCount - activeEmployees,
    },
    leaves: {
      pending: pendingLeaves,
      approvedThisMonth,
    },
    attendance: attendanceBreakdown,
    leavesByType,
  };
};
