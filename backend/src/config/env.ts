import dotenv from "dotenv";
import path from "path";

// Load .env from the project root
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

/**
 * Reads a required environment variable.
 * Throws immediately at startup if it's missing, instead of
 * failing later with a confusing Mongoose connection error.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  PORT: parseInt(optionalEnv("PORT", "5000"), 10),

  // Falls back to a local MongoDB instance if MONGO_URI isn't set,
  // so local dev works out of the box.
  MONGO_URI: optionalEnv("MONGO_URI", "mongodb://127.0.0.1:27017/leave_attendance_db"),

  JWT_SECRET: optionalEnv("JWT_SECRET", "dev_secret_change_me"),
  JWT_EXPIRES_IN: optionalEnv("JWT_EXPIRES_IN", "1d"),

  // Attendance policy — placeholder defaults, finalize with actual HR policy.
  ATTENDANCE_LATE_CUTOFF_MINUTES: parseInt(
    optionalEnv("ATTENDANCE_LATE_CUTOFF_MINUTES", "570"), // 9:30 AM local
    10
  ),
  ATTENDANCE_MIN_MINUTES_FULL_DAY: parseInt(
    optionalEnv("ATTENDANCE_MIN_MINUTES_FULL_DAY", "240"), // 4 hours
    10
  ),
  ATTENDANCE_WEEKEND_DAYS: optionalEnv("ATTENDANCE_WEEKEND_DAYS", "0,6"), // Sun,Sat
};

export type Env = typeof env;