import { Department } from "../models/department.model";

export const seedDepartments = async () => {
  const existingCount =
    await Department.countDocuments();

  if (existingCount > 0) {
    console.log(
      "Departments already exist. Skipping department seed."
    );

    return;
  }

  await Department.insertMany([
    {
      name: "Engineering",
    },
    {
      name: "Human Resources",
    },
    {
      name: "Finance",
    },
  ]);

  console.log(
    "Departments seeded successfully"
  );
};