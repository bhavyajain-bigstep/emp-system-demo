import { hash } from "bcrypt";
import { Employee } from "../models/employee.model";
import { Department } from "../models/department.model";

export const seedEmployees = async () => {
  const existingCount =
    await Employee.countDocuments();

  if (existingCount > 0) {
    console.log(
      "Employees already exist. Skipping employee seed."
    );

    return;
  }

  const engineering =
    await Department.findOne({
      name: "Engineering",
    });

  const hr =
    await Department.findOne({
      name: "Human Resources",
    });

  if (!engineering || !hr) {
    throw new Error(
      "Required departments not found. Seed departments first."
    );
  }

  const passwordHash = await hash(
  "Password@123",
  12
);

  const managerId = undefined;

  const employees = [
    {
      employeeCode: "EMP-ADMIN",
      name: "Admin User",
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN" as const,
      departmentId: hr._id,
      joiningDate: new Date(
        "2026-01-01"
      ),
      timezone: "Asia/Kolkata",
      status: "ACTIVE" as const,
    },

    {
      employeeCode: "EMP-HR",
      name: "HR User",
      email: "hr@example.com",
      passwordHash,
      role: "HR" as const,
      departmentId: hr._id,
      joiningDate: new Date(
        "2026-01-01"
      ),
      timezone: "Asia/Kolkata",
      status: "ACTIVE" as const,
    },

    {
      employeeCode: "EMP-MGR",
      name: "Engineering Manager",
      email: "manager@example.com",
      passwordHash,
      role: "MANAGER" as const,
      departmentId: engineering._id,
      joiningDate: new Date(
        "2026-01-01"
      ),
      timezone: "Asia/Kolkata",
      status: "ACTIVE" as const,
    },

    {
      employeeCode: "EMP-001",
      name: "Test Employee",
      email: "employee@example.com",
      passwordHash,
      role: "EMPLOYEE" as const,
      departmentId: engineering._id,
      joiningDate: new Date(
        "2026-01-01"
      ),
      timezone: "Asia/Kolkata",
      status: "ACTIVE" as const,
    },
  ];

  const createdEmployees =
    await Employee.insertMany(
      employees
    );

  const manager = createdEmployees.find(
    (employee) =>
      employee.employeeCode ===
      "EMP-MGR"
  );

  const hrUser = createdEmployees.find(
    (employee) =>
      employee.employeeCode ===
      "EMP-HR"
  );

  const employee = createdEmployees.find(
    (employee) =>
      employee.employeeCode ===
      "EMP-001"
  );

  if (!manager || !hrUser || !employee) {
    throw new Error(
      "Failed to create required employees"
    );
  }

  /*
   * Assign Engineering Manager
   */
  await Department.findOneAndUpdate(
    {
      name: "Engineering",
    },
    {
      managerId: manager._id,
    }
  );

  /*
   * Assign HR as HR department manager
   */
  await Department.findOneAndUpdate(
    {
      name: "Human Resources",
    },
    {
      managerId: hrUser._id,
    }
  );

  /*
   * Assign manager to employee
   */
  await Employee.findByIdAndUpdate(
    employee._id,
    {
      managerId: manager._id,
    }
  );

  console.log(
    `Employees seeded successfully: ${createdEmployees.length}`
  );
};