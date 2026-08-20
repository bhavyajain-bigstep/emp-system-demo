export type Role = "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type AttendanceStatus = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "LEAVE";

export interface User {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string;
  managerId?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Department {
  _id: string;
  name: string;
  managerId?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  _id: string;
  employeeCode: string;
  name: string;
  email: string;
  role: Role;
  managerId?: string;
  departmentId?: string;
  joiningDate?: string;
  timezone?: string;
  status: EmployeeStatus;
  createdAt?: string;
  updatedAt?: string;
  manager?: Pick<Employee, "employeeCode" | "name" | "email" | "role">;
  department?: Pick<Department, "name">;
}

export interface LeaveTypeRules {
  allowNegativeBalance: boolean;
  excludeWeekends: boolean;
  excludeMandatoryHolidays: boolean;
  excludeOptionalHolidays?: boolean;
  allowHalfDay: boolean;
  allowCancellation: boolean;
  maxConsecutiveDays: number;
  minNoticeDays: number;
}

export interface LeaveType {
  _id: string;
  name: string;
  code: string;
  annualQuota: number;
  rules: LeaveTypeRules;
  status: "ACTIVE" | "INACTIVE";
}

export interface LeaveBalance {
  _id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  available: number;
  employee?: Pick<Employee, "employeeCode" | "name" | "email">;
  leaveType?: Pick<LeaveType, "name" | "code" | "annualQuota" | "rules">;
}

export interface LeaveRequest {
  _id: string;
  employeeId: string | Partial<Employee>;
  leaveTypeId: string | Pick<LeaveType, "_id" | "name" | "code" | "annualQuota" | "rules">;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string | Partial<Employee>;
  approvedAt?: string;
  rejectedBy?: string | Partial<Employee>;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  _id: string;
  employeeId: string | Partial<Employee>;
  date: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  workingHours?: number;
  workingMinutes?: number;
  isLate?: boolean;
  timezone?: string;
}

export interface AttendanceSummary {
  employeeId: string;
  year: number;
  month: number;
  totalWorkingDays: number;
  workingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  absentDays: number;
  holidays: number;
  weekends: number;
  attendancePercentage: number;
}

export interface Holiday {
  _id: string;
  date: string;
  name: string;
  optional: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AuditAction =
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "EMPLOYEE_STATUS_CHANGED"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_UPDATED"
  | "DEPARTMENT_ARCHIVED"
  | "LEAVE_TYPE_CREATED"
  | "LEAVE_TYPE_UPDATED"
  | "LEAVE_BALANCE_CREATED"
  | "LEAVE_BALANCE_UPDATED"
  | "LEAVE_CREATED"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "LEAVE_CANCELLED"
  | "HOLIDAY_CREATED"
  | "HOLIDAY_DELETED"
  | string;

export interface AuditLog {
  _id: string;
  actorId?: string | Partial<Employee>;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiErrorBody {
  success: boolean;
  message: string;
  error: {
    code: string;
    message?: string;
    issues?: unknown;
  };
}

export interface DashboardSummary {
  asOf: string;
  employees: {
    total: number;
    active: number;
    inactive: number;
  };
  leaves: {
    pending: number;
    approvedThisMonth: number;
  };
  attendance: {
    present: number;
    late: number;
    absent: number;
    halfDay: number;
    total: number;
  };
  leavesByType: Array<{
    _id: string;
    count: number;
  }>;
}