import { Types } from "mongoose";
import { AppError } from "../errors/app-error";
import { stringify } from "csv-stringify/sync";
import { Readable } from "stream";
import {
  findAttendanceReportPage,
} from "../repositories/attendance.repository";
import {
  findLeaveReportPage,
} from "../repositories/leave-request.repository";
import {
  findEmployeeIdsByFilter,
  findManagerTeamAndSelfIds,
} from "../repositories/employee.repository";

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
    const allowedIds = await findManagerTeamAndSelfIds(auth.userId);

    if (requestedEmployeeId) {
      if (!allowedIds.includes(requestedEmployeeId)) {
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

  if (requestedEmployeeId) {
    empFilter._id = new Types.ObjectId(requestedEmployeeId);
  }
  if (requestedDepartmentId) {
    empFilter.departmentId = new Types.ObjectId(requestedDepartmentId);
  }

  return empFilter;
};

const buildAttendanceQuery = (
  filter: AttendanceReportFilter,
  targetEmployeeIds: string[] | null
): Record<string, any> => {
  const from = filter.from || filter.startDate;
  const to = filter.to || filter.endDate;

  const query: Record<string, any> = {};

  if (targetEmployeeIds !== null) {
    query.employeeId = { $in: targetEmployeeIds };
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (from || to) {
    query.date = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  return query;
};

const buildLeaveQuery = (
  filter: LeaveReportFilter,
  targetEmployeeIds: string[] | null
): Record<string, any> => {
  const from = filter.from || filter.startDate;
  const to = filter.to || filter.endDate;

  const query: Record<string, any> = {};

  if (targetEmployeeIds !== null) {
    query.employeeId = { $in: targetEmployeeIds };
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.leaveTypeId) {
    query.leaveTypeId = new Types.ObjectId(filter.leaveTypeId);
  }

  if (from || to) {
    if (from && to) {
      query.fromDate = { $lte: new Date(to) };
      query.toDate = { $gte: new Date(from) };
    } else if (from) {
      query.toDate = { $gte: new Date(from) };
    } else if (to) {
      query.fromDate = { $lte: new Date(to) };
    }
  }

  return query;
};

const formatAttendanceRecord = (record: any) => {
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
};

export const getAttendanceReportService = async (
  filter: AttendanceReportFilter,
  page = 1,
  limit = 20,
  auth?: AuthContext
) => {
  const empFilter = await buildAuthorizedEmployeeFilter(
    filter.employeeId,
    filter.departmentId,
    auth
  );

  let targetEmployeeIds: string[] | null = null;
  if (Object.keys(empFilter).length > 0) {
    targetEmployeeIds = await findEmployeeIdsByFilter(empFilter);
  }

  const attendanceQuery = buildAttendanceQuery(filter, targetEmployeeIds);
  const skip = (page - 1) * limit;

  const { records, total } = await findAttendanceReportPage(attendanceQuery, skip, limit);

  return {
    records: records.map(formatAttendanceRecord),
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

export const streamAttendanceReportCsv = (
  filter: AttendanceReportFilter,
  auth?: AuthContext
): Readable => {
  const columns = ["Employee Code", "Employee Name", "Department", "Date", "Status", "Check-In Time", "Check-Out Time", "Working Hours", "Working Minutes", "Late", "Timezone"];
  async function* rows() {
    yield stringify([], { header: true, columns });
    for (let page = 1; ; page++) {
      const result = await getAttendanceReportService(filter, page, 100, auth);
      if (result.records.length === 0) return;
      yield stringify(result.records.map((r) => {
        const emp = r.employee as any;
        return [emp?.employeeCode || "", emp?.name || "", emp?.departmentId?.name || "", r.date, r.status,
          r.checkInAt ? new Date(r.checkInAt).toISOString() : "", r.checkOutAt ? new Date(r.checkOutAt).toISOString() : "",
          r.workingHours, r.workingMinutes, r.isLate ? "YES" : "NO", r.timezone || ""];
      }), { header: false, columns });
      if (result.records.length < 100) return;
    }
  }
  return Readable.from(rows());
};

export const getLeaveReportService = async (
  filter: LeaveReportFilter,
  page = 1,
  limit = 20,
  auth?: AuthContext
) => {
  const empFilter = await buildAuthorizedEmployeeFilter(
    filter.employeeId,
    filter.departmentId,
    auth
  );

  let targetEmployeeIds: string[] | null = null;
  if (Object.keys(empFilter).length > 0) {
    targetEmployeeIds = await findEmployeeIdsByFilter(empFilter);
  }

  const leaveQuery = buildLeaveQuery(filter, targetEmployeeIds);
  const skip = (page - 1) * limit;

  const { records, total } = await findLeaveReportPage(leaveQuery, skip, limit);

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

export const streamLeaveReportCsv = (
  filter: LeaveReportFilter,
  auth?: AuthContext
): Readable => {
  const columns = ["Leave ID", "Employee Code", "Employee Name", "Department", "Leave Type", "From Date", "To Date", "Days", "Status", "Reason", "Approved / Action By", "Approved At", "Rejection Reason", "Cancelled At", "Created At"];
  async function* rows() {
    yield stringify([], { header: true, columns });
    for (let page = 1; ; page++) {
      const result = await getLeaveReportService(filter, page, 100, auth);
      if (result.records.length === 0) return;
      yield stringify(result.records.map((r: any) => [
        r._id.toString(), r.employeeId?.employeeCode || "", r.employeeId?.name || "", r.employeeId?.departmentId?.name || "",
        r.leaveTypeId?.name || "", r.fromDate ? new Date(r.fromDate).toISOString().split("T")[0] : "",
        r.toDate ? new Date(r.toDate).toISOString().split("T")[0] : "", r.days, r.status, r.reason || "",
        r.approvedBy?.name || "", r.approvedAt ? new Date(r.approvedAt).toISOString() : "", r.rejectionReason || "",
        r.cancelledAt ? new Date(r.cancelledAt).toISOString() : "", r.createdAt ? new Date(r.createdAt).toISOString() : "",
      ]), { header: false, columns });
      if (result.records.length < 100) return;
    }
  }
  return Readable.from(rows());
};