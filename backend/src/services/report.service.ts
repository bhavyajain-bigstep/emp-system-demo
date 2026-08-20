import { Types } from "mongoose";
import { Attendance, IAttendance } from "../models/attendance.model";
import { LeaveRequest, ILeaveRequest } from "../models/leave-request.model";
import { Employee } from "../models/employee.model";
import { AppError } from "../errors/app-error";
import { stringify } from "csv-stringify/sync";

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
    const matchedEmployees = await Employee.find(empFilter).select("_id");
    targetEmployeeIds = matchedEmployees.map((e) => e._id as Types.ObjectId);
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

  const [totalEmployees, activeEmployees, pendingLeaves, approvedThisMonth, attendanceToday] =
    await Promise.all([
      Employee.countDocuments(employeeQuery),
      Employee.countDocuments({ ...employeeQuery, status: "ACTIVE" }),
      LeaveRequest.countDocuments({ ...leaveQuery, status: "PENDING" }),
      LeaveRequest.countDocuments({
        ...leaveQuery,
        status: "APPROVED",
        approvedAt: { $gte: startOfMonth },
      }),
      Attendance.find({ ...attendanceQuery, date: { $gte: startOfDay, $lt: endOfDay } }).select(
        "employeeId status"
      ),
    ]);

  const attendanceBreakdown = {
    present: attendanceToday.filter((a) => a.status === "PRESENT").length,
    late: attendanceToday.filter((a) => a.status === "LATE").length,
    absent: attendanceToday.filter((a) => a.status === "ABSENT").length,
    halfDay: attendanceToday.filter((a) => a.status === "HALF_DAY").length,
    total: attendanceToday.length,
  };

  const leavesByType = await LeaveRequest.aggregate([
    { $match: leaveQuery },
    { $group: { _id: "$leaveTypeId", count: { $sum: 1 } } },
  ]);

  return {
    asOf: now,
    employees: {
      total: totalEmployees,
      active: activeEmployees,
      inactive: totalEmployees - activeEmployees,
    },
    leaves: {
      pending: pendingLeaves,
      approvedThisMonth,
    },
    attendance: attendanceBreakdown,
    leavesByType,
  };
};
