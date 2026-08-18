import {
  Department,
  IDepartment,
} from "../models/department.model";

export const findDepartmentById = async (
  id: string
): Promise<IDepartment | null> => {
  return Department.findById(id)
    .populate(
      "managerId",
      "name employeeCode email role"
    );
};

export const findDepartmentByName = async (
  name: string
): Promise<IDepartment | null> => {
  return Department.findOne({
    name: name.trim(),
  });
};

export const findDepartments =
  async (): Promise<IDepartment[]> => {
    return Department.find()
      .populate(
        "managerId",
        "name employeeCode email role"
      )
      .sort({ name: 1 });
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
  return Department.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  ).populate(
    "managerId",
    "name employeeCode email role"
  );
};

export const deleteDepartment = async (
  id: string
): Promise<IDepartment | null> => {
  return Department.findByIdAndDelete(id);
};