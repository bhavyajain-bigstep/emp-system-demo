import {
  Employee,
  IEmployee,
} from "../models/employee.model";

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