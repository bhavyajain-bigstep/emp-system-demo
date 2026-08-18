import swaggerJsdoc from "swagger-jsdoc";

const swaggerDefinition: swaggerJsdoc.SwaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Employee Leave & Attendance Management System API",
    version: "1.0.0",
    description:
      "Backend REST API for employee management, department structure, attendance tracking, and leave workflows.",
  },
  servers: [
    {
      url: "/api/v1",
      description: "Versioned API base path",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Not enforced on any route yet — auth middleware is still in development. Documented in advance so routes can be marked with `security` once it lands.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Something went wrong" },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "SOME_ERROR_CODE" },
            },
          },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          total: { type: "integer", example: 100 },
          totalPages: { type: "integer", example: 10 },
        },
      },
      Employee: {
        type: "object",
        properties: {
          _id: { type: "string", example: "6612abf4c1a2b3d4e5f6a7b8" },
          employeeCode: { type: "string", example: "EMP-1042" },
          name: { type: "string", example: "Jayant Kaushik" },
          email: { type: "string", format: "email" },
          role: {
            type: "string",
            enum: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"],
            example: "EMPLOYEE",
          },
          managerId: { type: "string", nullable: true },
          departmentId: { type: "string", nullable: true },
          joiningDate: { type: "string", format: "date-time" },
          status: {
            type: "string",
            enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
            example: "ACTIVE",
          },
          timezone: { type: "string", example: "Asia/Kolkata" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Department: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string", example: "Engineering" },
          managerId: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["ACTIVE", "ARCHIVED"],
            example: "ACTIVE",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Attendance: {
        type: "object",
        properties: {
          _id: { type: "string" },
          employeeId: { type: "string" },
          date: { type: "string", example: "2026-08-18" },
          checkInAt: { type: "string", format: "date-time" },
          checkOutAt: { type: "string", format: "date-time", nullable: true },
          status: {
            type: "string",
            enum: ["PRESENT", "LATE", "HALF_DAY", "ABSENT", "LEAVE"],
            example: "PRESENT",
          },
          timezone: { type: "string", example: "Asia/Kolkata" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  // Scans JSDoc `@swagger` comment blocks in every route file.
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);