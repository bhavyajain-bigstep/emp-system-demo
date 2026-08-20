import {
  Employee,
  IEmployee,
} from "../models/employee.model";

import { Types } from "mongoose";

export const findEmployeeById = async (
  id: string
): Promise<IEmployee | null> => {
  return Employee.findById(id)
    .populate(
      "managerId",
      "name employeeCode email"
    )
    .populate(
      "departmentId",
      "name"
    );
};

export const findEmployeeByIdLean = async (
  id: string
): Promise<IEmployee | null> => {
  return Employee.findById(id).lean() as unknown as Promise<IEmployee | null>;
};

export const findEmployeeByEmail = async (
  email: string
): Promise<IEmployee | null> => {
  return Employee.findOne({
    email,
  }).select("+passwordHash");
};

export const findEmployeeByCode = async (
  employeeCode: string
): Promise<IEmployee | null> => {
  return Employee.findOne({
    employeeCode,
  });
};

export const findEmployees = async (
  filter: Record<string, unknown>,
  skip: number,
  limit: number
) => {
  const [
    employees,
    total,
  ] = await Promise.all([
    Employee.find(filter)
      .select("-passwordHash")
      .populate(
        "managerId",
        "name employeeCode"
      )
      .populate(
        "departmentId",
        "name"
      )
      .skip(skip)
      .limit(limit)
      .sort({
        createdAt: -1,
      }),

    Employee.countDocuments(
      filter
    ),
  ]);

  return {
    employees,
    total,
  };
};

export const createEmployee = async (
  data: Partial<IEmployee>
): Promise<IEmployee> => {
  return Employee.create(data);
};

export const updateEmployee = async (
  id: string,
  data: Partial<IEmployee>
): Promise<IEmployee | null> => {
  return Employee.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  )
    .select("-passwordHash")
    .populate(
      "managerId",
      "name employeeCode"
    )
    .populate(
      "departmentId",
      "name"
    );
};

export const countActiveEmployeesInDepartment = async (
  departmentId: string
): Promise<number> => {
  return Employee.countDocuments({
    departmentId,
    status: "ACTIVE",
  });
};

export const findEmployeeIdsByFilter = async (
  filter: Record<string, unknown>
): Promise<string[]> => {
  const docs = await Employee.find(filter)
    .select("_id")
    .lean();
  return docs.map((d) => d._id.toString());
};

export const findManagerTeamAndSelfIds = async (
  managerId: string
): Promise<string[]> => {
  if (!Types.ObjectId.isValid(managerId)) return [];
  return findEmployeeIdsByFilter({
    $or: [
      { managerId: new Types.ObjectId(managerId) },
      { _id: new Types.ObjectId(managerId) },
    ],
  });
};

export const findDirectReportIds = async (
  managerId: string
): Promise<string[]> => {
  if (!Types.ObjectId.isValid(managerId)) return [];
  const docs = await Employee.find({ managerId })
    .select("_id")
    .lean();
  return docs.map((d) => d._id.toString());
};

export const getEmployeeManagerId = async (
  employeeId: string
): Promise<string | null> => {
  if (!Types.ObjectId.isValid(employeeId)) return null;
  const doc = await Employee.findById(employeeId)
    .select("managerId")
    .lean() as unknown as { managerId?: Types.ObjectId } | null;
  return doc?.managerId?.toString() ?? null;
};