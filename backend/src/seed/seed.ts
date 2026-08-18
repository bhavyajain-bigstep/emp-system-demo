import "dotenv/config";

import {
  connectDB,
  disconnectDB,
} from "../config/db";

import { seedDepartments } from "./department.seed";
import { seedEmployees } from "./employee.seed";
import { seedLeaveTypes } from "./leave-type.seed";

const runSeed = async () => {
  try {
    console.log(
      "Starting database seed..."
    );

    await connectDB();

    await seedDepartments();

    await seedEmployees();

    await seedLeaveTypes();

    console.log(
      "Database seed completed successfully"
    );
  } catch (error) {
    console.error(
      "Database seed failed:",
      error
    );

    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

runSeed();