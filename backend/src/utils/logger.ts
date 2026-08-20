// @ts-ignore - pino types may not be installed in build env
import pino from "pino";
// @ts-ignore
import pinoHttp from "pino-http";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: isProd ? "info" : "debug",
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
      },
  base: { service: "leave-attendance-api" },
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req: any, res: any, err: any) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req: any, res: any) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req: any, res: any, err: any) => `${req.method} ${req.url} ${res.statusCode} - ${err?.message}`,
  customProps: (req: any, res: any) => ({
    requestId: req.headers["x-request-id"] || req.id,
    userAgent: req.headers["user-agent"],
  }),
});