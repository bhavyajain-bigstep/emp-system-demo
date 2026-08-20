import { api, unwrap } from "./api";
import type {
  ApiResponse,
  AttendanceRecord,
  AttendanceSummary,
  AuditLog,
  DashboardSummary,
  Department,
  Employee,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  LoginResponse,
  PaginationMeta,
} from "@/types";

type Paginated<T> = { items: T[]; pagination: PaginationMeta };

function paginated<T>(data: T[], pagination: PaginationMeta): Paginated<T> {
  return { items: data, pagination };
}

function qs(params?: Record<string, unknown>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return unwrap(api.post<ApiResponse<LoginResponse>>("/auth/login", { email, password }));
  },
};

export const employeeApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    departmentId?: string;
    status?: string;
    role?: string;
  }): Promise<Paginated<Employee>> {
    const res = await api.get<ApiResponse<Employee[]>>(`/employees${qs(params)}`);
    return paginated(res.data.data, res.data.pagination!);
  },
  async get(id: string): Promise<Employee> {
    return unwrap(api.get<ApiResponse<Employee>>(`/employees/${id}`));
  },
  async create(data: Record<string, unknown>): Promise<Employee> {
    return unwrap(api.post<ApiResponse<Employee>>("/employees", data));
  },
  async update(id: string, data: Record<string, unknown>): Promise<Employee> {
    return unwrap(api.patch<ApiResponse<Employee>>(`/employees/${id}`, data));
  },
};

export const departmentApi = {
  async list(params?: { status?: string; page?: number; limit?: number }): Promise<Paginated<Department>> {
    const res = await api.get<ApiResponse<Department[]>>(`/departments${qs(params)}`);
    return paginated(res.data.data, res.data.pagination!);
  },
  async create(data: { name: string; managerId?: string }): Promise<Department> {
    return unwrap(api.post<ApiResponse<Department>>("/departments", data));
  },
  async update(id: string, data: Record<string, unknown>): Promise<Department> {
    return unwrap(api.patch<ApiResponse<Department>>(`/departments/${id}`, data));
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/departments/${id}`);
  },
};

export const leaveTypeApi = {
  async list(): Promise<LeaveType[]> {
    return unwrap(api.get<ApiResponse<LeaveType[]>>("/leave-types"));
  },
  async create(data: Record<string, unknown>): Promise<LeaveType> {
    return unwrap(api.post<ApiResponse<LeaveType>>("/leave-types", data));
  },
  async update(id: string, data: Record<string, unknown>): Promise<LeaveType> {
    return unwrap(api.patch<ApiResponse<LeaveType>>(`/leave-types/${id}`, data));
  },
};

export const leaveBalanceApi = {
  async listAll(params?: { year?: number; employeeId?: string }): Promise<Paginated<LeaveBalance>> {
    const res = await api.get<ApiResponse<LeaveBalance[]>>(`/leave-balances${qs(params)}`);
    return paginated(res.data.data, res.data.pagination!);
  },
  async listMine(year?: number): Promise<LeaveBalance[]> {
    return unwrap(api.get<ApiResponse<LeaveBalance[]>>(`/leave-balances/my${qs({ year })}`));
  },
  async listByEmployee(employeeId: string, year?: number): Promise<LeaveBalance[]> {
    return unwrap(
      api.get<ApiResponse<LeaveBalance[]>>(`/leave-balances/employee/${employeeId}${qs({ year })}`)
    );
  },
  async create(data: Record<string, unknown>): Promise<LeaveBalance> {
    return unwrap(api.post<ApiResponse<LeaveBalance>>("/leave-balances", data));
  },
  async update(id: string, allocated: number): Promise<LeaveBalance> {
    return unwrap(api.patch<ApiResponse<LeaveBalance>>(`/leave-balances/${id}`, { allocated }));
  },
};

export const attendanceApi = {
  async checkIn(): Promise<AttendanceRecord> {
    return unwrap(api.post<ApiResponse<AttendanceRecord>>("/attendance/check-in"));
  },
  async checkInFor(employeeId: string): Promise<AttendanceRecord> {
    return unwrap(api.post<ApiResponse<AttendanceRecord>>(`/attendance/${employeeId}/check-in`));
  },
  async checkOut(): Promise<AttendanceRecord> {
    return unwrap(api.post<ApiResponse<AttendanceRecord>>("/attendance/check-out"));
  },
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<Paginated<AttendanceRecord>> {
    const res = await api.get<ApiResponse<AttendanceRecord[]>>(`/attendance${qs(params)}`);
    return paginated(res.data.data, res.data.pagination!);
  },
  async summary(year: number, month: number): Promise<AttendanceSummary> {
    return unwrap(
      api.get<ApiResponse<AttendanceSummary>>(`/attendance/summary?year=${year}&month=${month}`)
    );
  },
};

export const leaveApi = {
  async create(data: {
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    reason: string;
  }): Promise<LeaveRequest> {
    return unwrap(api.post<ApiResponse<LeaveRequest>>("/leaves", data));
  },
  async listMine(): Promise<LeaveRequest[]> {
    return unwrap(api.get<ApiResponse<LeaveRequest[]>>("/leaves/my"));
  },
  async listPending(): Promise<LeaveRequest[]> {
    return unwrap(api.get<ApiResponse<LeaveRequest[]>>("/leaves/pending"));
  },
  async get(id: string): Promise<LeaveRequest> {
    return unwrap(api.get<ApiResponse<LeaveRequest>>(`/leaves/${id}`));
  },
  async approve(id: string): Promise<LeaveRequest> {
    return unwrap(api.put<ApiResponse<LeaveRequest>>(`/leaves/${id}/approve`));
  },
  async reject(id: string, reason: string): Promise<LeaveRequest> {
    return unwrap(api.put<ApiResponse<LeaveRequest>>(`/leaves/${id}/reject`, { rejectionReason: reason }));
  },
  async cancel(id: string): Promise<LeaveRequest> {
    return unwrap(api.put<ApiResponse<LeaveRequest>>(`/leaves/${id}/cancel`));
  },
};

export const holidayApi = {
  async list(params?: { year?: number; month?: number }): Promise<Holiday[]> {
    return unwrap(api.get<ApiResponse<Holiday[]>>(`/holidays${qs(params)}`));
  },
  async create(data: { date: string; name: string; optional: boolean }): Promise<Holiday> {
    return unwrap(api.post<ApiResponse<Holiday>>("/holidays", data));
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/holidays/${id}`);
  },
};

export interface AttendanceReportFilter {
  page?: number;
  limit?: number;
  employeeId?: string;
  departmentId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface LeaveReportFilter {
  page?: number;
  limit?: number;
  employeeId?: string;
  departmentId?: string;
  leaveTypeId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export const reportApi = {
  async attendance(filter: AttendanceReportFilter = {}): Promise<Paginated<AttendanceRecord>> {
    const res = await api.get<ApiResponse<AttendanceRecord[]>>(`/reports/attendance${qs(filter)}`);
    return paginated(res.data.data, res.data.pagination!);
  },
  async attendanceCsv(filter: Omit<AttendanceReportFilter, "page" | "limit"> = {}): Promise<string> {
    const res = await api.get<string>(`/reports/attendance/export${qs(filter)}`, {
      responseType: "text",
    });
    return res.data;
  },
  async leaves(filter: LeaveReportFilter = {}): Promise<Paginated<LeaveRequest>> {
    const res = await api.get<ApiResponse<LeaveRequest[]>>(`/reports/leaves${qs(filter)}`);
    return paginated(res.data.data, res.data.pagination!);
  },
  async leavesCsv(filter: Omit<LeaveReportFilter, "page" | "limit"> = {}): Promise<string> {
    const res = await api.get<string>(`/reports/leaves/export${qs(filter)}`, {
      responseType: "text",
    });
    return res.data;
  },
  async dashboard(): Promise<DashboardSummary> {
    return unwrap(api.get<ApiResponse<DashboardSummary>>("/reports/dashboard"));
  },
};

export const auditLogApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    from?: string;
    to?: string;
  }): Promise<Paginated<AuditLog>> {
    const res = await api.get<ApiResponse<AuditLog[]>>(`/audit-logs${qs(params)}`);
    return paginated(res.data.data, res.data.pagination!);
  },
};