import { LeaveType } from "../models/leave-type.model";

export const seedLeaveTypes = async () => {
  const existingCount =
    await LeaveType.countDocuments();

  if (existingCount > 0) {
    console.log(
      "Leave types already exist. Skipping leave type seed."
    );

    return;
  }

  await LeaveType.insertMany([
    {
      name: "Annual Leave",

      code: "ANNUAL",

      annualQuota: 20,

      rules: {
        allowNegativeBalance: false,
        excludeWeekends: true,
        excludeMandatoryHolidays: true,
        allowHalfDay: false,
        allowCancellation: true,
        maxConsecutiveDays: 15,
        minNoticeDays: 2,
      },

      status: "ACTIVE",
    },

    {
      name: "Sick Leave",

      code: "SICK",

      annualQuota: 10,

      rules: {
        allowNegativeBalance: false,
        excludeWeekends: true,
        excludeMandatoryHolidays: true,
        allowHalfDay: true,
        allowCancellation: false,
        maxConsecutiveDays: 10,
        minNoticeDays: 0,
      },

      status: "ACTIVE",
    },

    {
      name: "Casual Leave",

      code: "CASUAL",

      annualQuota: 12,

      rules: {
        allowNegativeBalance: false,
        excludeWeekends: true,
        excludeMandatoryHolidays: true,
        allowHalfDay: true,
        allowCancellation: true,
        maxConsecutiveDays: 5,
        minNoticeDays: 1,
      },

      status: "ACTIVE",
    },
  ]);

  console.log(
    "Leave types seeded successfully"
  );
};