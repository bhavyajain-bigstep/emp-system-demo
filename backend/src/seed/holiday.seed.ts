import { Holiday } from "../models/holiday.model";
import { Employee } from "../models/employee.model";

export const seedHolidays = async () => {
  const existingCount = await Holiday.countDocuments();

  if (existingCount > 0) {
    console.log("Holidays already exist. Skipping holiday seed.");
    return;
  }

  const admin = await Employee.findOne({ employeeCode: "EMP-ADMIN" });

  if (!admin) {
    throw new Error("Admin user not found. Seed employees first.");
  }

  const holidays = [
    {
      date: new Date("2026-08-17"),
      name: "Company Holiday",
      optional: false,
      description: "Company-wide holiday",
      createdBy: admin._id,
    },
  ];

  await Holiday.insertMany(holidays);

  console.log(`Holidays seeded successfully: ${holidays.length}`);
};