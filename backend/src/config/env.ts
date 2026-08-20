import dotenv from "dotenv";
import path from "path";

// Load .env from the project root
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

/**
 * Reads a required environment variable.
 * Throws immediately at startup if it's missing.
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

const isProd = process.env.NODE_ENV === "production";

export const env = {
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  PORT: parseInt(optionalEnv("PORT", "5000"), 10),

  MONGO_URI: optionalEnv("MONGO_URI", "mongodb://127.0.0.1:27017/leave_attendance_db"),

  // In production JWT_SECRET must be provided via env; no default.
  JWT_SECRET: isProd ? requireEnv("JWT_SECRET") : optionalEnv("JWT_SECRET", "dev_secret_change_me"),
  JWT_EXPIRES_IN: optionalEnv("JWT_EXPIRES_IN", "15m"),
  JWT_REFRESH_EXPIRES_IN: optionalEnv("JWT_REFRESH_EXPIRES_IN", "7d"),

  FRONTEND_ORIGIN: optionalEnv("FRONTEND_ORIGIN", "http://localhost:5173"),

  ATTENDANCE_LATE_CUTOFF_MINUTES: parseInt(
    optionalEnv("ATTENDANCE_LATE_CUTOFF_MINUTES", "570"),
    10
  ),
  ATTENDANCE_MIN_MINUTES_FULL_DAY: parseInt(
    optionalEnv("ATTENDANCE_MIN_MINUTES_FULL_DAY", "240"),
    10
  ),
  ATTENDANCE_WEEKEND_DAYS: optionalEnv("ATTENDANCE_WEEKEND_DAYS", "0,6"),
};

export type Env = typeof env;