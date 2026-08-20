import { logger, createCorrelationId, toPlainObject } from "../../src/utils/logger";

describe("Logger", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    consoleSpy = jest.spyOn(console, "info").mockImplementation();
    consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createCorrelationId", () => {
    it("should generate a unique correlation ID", () => {
      const id1 = createCorrelationId();
      const id2 = createCorrelationId();
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it("should include timestamp prefix", () => {
      const id = createCorrelationId();
      expect(id).toMatch(/^\d+-/);
    });
  });

  describe("toPlainObject", () => {
    it("should return undefined for null", () => {
      expect(toPlainObject(null)).toBeUndefined();
    });

    it("should return undefined for undefined", () => {
      expect(toPlainObject(undefined)).toBeUndefined();
    });

    it("should call toObject() on Mongoose-like documents", () => {
      const mockDoc = {
        toObject: jest.fn().mockReturnValue({ id: "123", name: "test" }),
      };
      const result = toPlainObject(mockDoc);
      expect(mockDoc.toObject).toHaveBeenCalled();
      expect(result).toEqual({ id: "123", name: "test" });
    });

    it("should cast plain objects directly", () => {
      const obj = { id: "123", name: "test" };
      expect(toPlainObject(obj)).toEqual(obj);
    });
  });

  describe("logger methods", () => {
    it("should call logger.debug without error", () => {
      expect(() => logger.debug("test message")).not.toThrow();
    });

    it("should call logger.info with context", () => {
      expect(() => logger.info("test message", { correlationId: "abc123" })).not.toThrow();
    });

    it("should call logger.warn with context", () => {
      expect(() => logger.warn("test message", { correlationId: "abc123" })).not.toThrow();
    });

    it("should call logger.error with context", () => {
      expect(() => logger.error("test message", { correlationId: "abc123" })).not.toThrow();
    });

    it("should sanitize sensitive keys", () => {
      logger.info("test", { password: "secret123", apiKey: "key123" });
      const calls = (console.info as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const loggedData = JSON.parse(lastCall[0].replace(/^\[INFO\] /, ""));
      expect(loggedData.password).toBe("[REDACTED]");
      expect(loggedData.apiKey).toBe("[REDACTED]");
    });

    it("should call logger.audit for audit events", () => {
      const auditEntry = {
        eventType: "TEST_EVENT",
        actorId: "user123",
        entityType: "EMPLOYEE",
        entityId: "emp123",
        action: "TEST_EVENT",
        correlationId: "corr123",
        timestamp: new Date(),
      };
      expect(() => logger.audit(auditEntry)).not.toThrow();
    });
  });
});