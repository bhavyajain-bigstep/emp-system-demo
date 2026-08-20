import { env } from "../config/env";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  correlationId?: string;
  userId?: string;
  role?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

export interface AuditLogEntry {
  eventType: string;
  actorId?: string;
  actorRole?: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  timestamp: Date;
}

export const toPlainObject = <T extends object>(obj: T | null | undefined): Record<string, unknown> | undefined => {
  if (!obj) return undefined;
  if (typeof (obj as any).toObject === "function") {
    return (obj as any).toObject() as Record<string, unknown>;
  }
  return obj as Record<string, unknown>;
};

const isProduction = env.NODE_ENV === "production";

const SENSITIVE_KEYS = new Set<string>(
  [
    "password",
    "passwordhash",
    "token",
    "accesstoken",
    "refreshtoken",
    "authorization",
    "cookie",
    "secret",
    "jwt",
    "apikey",
    "apisecret",
  ].map((k) => k.toLowerCase())
);

const sanitize = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const formatTimestamp = (): string => {
  return new Date().toISOString();
};

const writeLog = (level: LogLevel, message: string, context: LogContext = {}) => {
  const logEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    ...context,
    environment: env.NODE_ENV,
  };

  const sanitized = sanitize(logEntry);

  if (isProduction) {
    console.log(JSON.stringify(sanitized));
  } else {
    const pretty = JSON.stringify(sanitized, null, 2);
    switch (level) {
      case "debug":
        console.debug(`[DEBUG] ${pretty}`);
        break;
      case "info":
        console.info(`[INFO] ${pretty}`);
        break;
      case "warn":
        console.warn(`[WARN] ${pretty}`);
        break;
      case "error":
        console.error(`[ERROR] ${pretty}`);
        break;
    }
  }
};

export const logger = {
  debug: (message: string, context?: LogContext) => writeLog("debug", message, context),
  info: (message: string, context?: LogContext) => writeLog("info", message, context),
  warn: (message: string, context?: LogContext) => writeLog("warn", message, context),
  error: (message: string, context?: LogContext) => writeLog("error", message, context),

  audit: (entry: AuditLogEntry) => {
    const logEntry = {
      timestamp: entry.timestamp.toISOString(),
      level: "audit",
      eventType: entry.eventType,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValue: sanitize(entry.oldValue),
      newValue: sanitize(entry.newValue),
      metadata: sanitize(entry.metadata),
      correlationId: entry.correlationId,
    };

    if (isProduction) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.info(`[AUDIT] ${JSON.stringify(logEntry, null, 2)}`);
    }
  },
};

export const createCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};