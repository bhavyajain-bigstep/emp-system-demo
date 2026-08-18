import { Department, IDepartment } from "../models/department.model";

export const findDepartmentById = async (
  id: string
): Promise<IDepartment | null> => {
  return Department.findById(id).populate(
    "managerId",
    "name employeeCode email"
  );
};

export const findDepartmentByName = async (
  name: string
): Promise<IDepartment | null> => {
  return Department.findOne({ name });
};

export const findDepartments = async (
  filter: Record<string, unknown>,
  skip: number,
  limit: number
) => {
  const [departments, total] = await Promise.all([
    Department.find(filter)
      .populate("managerId", "name employeeCode")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),

    Department.countDocuments(filter),
  ]);

  return {
    departments,
    total,
  };
};

export const createDepartment = async (
  data: Partial<IDepartment>
): Promise<IDepartment> => {
  return Department.create(data);
};

export const updateDepartment = async (
  id: string,
  data: Partial<IDepartment>
): Promise<IDepartment | null> => {
  return Department.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate("managerId", "name employeeCode");
};