import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition: swaggerJSDoc.SwaggerDefinition = {
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
          "JWT authentication token.",
      },
    },

    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            example: "Something went wrong",
          },
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                example: "SOME_ERROR_CODE",
              },
            },
          },
        },
      },

      PaginationMeta: {
        type: "object",
        properties: {
          page: {
            type: "integer",
            example: 1,
          },
          limit: {
            type: "integer",
            example: 10,
          },
          total: {
            type: "integer",
            example: 100,
          },
          totalPages: {
            type: "integer",
            example: 10,
          },
        },
      },

      Employee: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "6612abf4c1a2b3d4e5f6a7b8",
          },

          employeeCode: {
            type: "string",
            example: "EMP-1042",
          },

          name: {
            type: "string",
            example: "Jayant Kaushik",
          },

          email: {
            type: "string",
            format: "email",
            example: "jayant@example.com",
          },

          role: {
            type: "string",
            enum: [
              "EMPLOYEE",
              "MANAGER",
              "HR",
              "ADMIN",
            ],
            example: "EMPLOYEE",
          },

          managerId: {
            type: "string",
            nullable: true,
          },

          departmentId: {
            type: "string",
            nullable: true,
          },

          joiningDate: {
            type: "string",
            format: "date-time",
          },

          status: {
            type: "string",
            enum: [
              "ACTIVE",
              "INACTIVE",
              "SUSPENDED",
            ],
            example: "ACTIVE",
          },

          timezone: {
            type: "string",
            example: "Asia/Kolkata",
          },

          createdAt: {
            type: "string",
            format: "date-time",
          },

          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },

      Department: {
        type: "object",
        properties: {
          _id: {
            type: "string",
          },

          name: {
            type: "string",
            example: "Engineering",
          },

          managerId: {
            type: "string",
            nullable: true,
          },

          status: {
            type: "string",
            enum: [
              "ACTIVE",
              "ARCHIVED",
            ],
            example: "ACTIVE",
          },

          createdAt: {
            type: "string",
            format: "date-time",
          },

          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },

      Attendance: {
        type: "object",
        properties: {
          _id: {
            type: "string",
          },

          employeeId: {
            type: "string",
          },

          date: {
            type: "string",
            example: "2026-08-18",
          },

          checkInAt: {
            type: "string",
            format: "date-time",
          },

          checkOutAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },

          status: {
            type: "string",
            enum: [
              "PRESENT",
              "LATE",
              "HALF_DAY",
              "ABSENT",
              "LEAVE",
            ],
            example: "PRESENT",
          },

          timezone: {
            type: "string",
            example: "Asia/Kolkata",
          },

          createdAt: {
            type: "string",
            format: "date-time",
          },

          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },

      AttendanceSummary: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
          },

          year: {
            type: "integer",
            example: 2026,
          },

          month: {
            type: "integer",
            example: 8,
          },

          totalWorkingDays: {
            type: "integer",
            example: 21,
          },

          workingDays: {
            type: "integer",
            example: 21,
          },

          presentDays: {
            type: "integer",
            example: 15,
          },

          lateDays: {
            type: "integer",
            example: 2,
          },

          halfDays: {
            type: "integer",
            example: 1,
          },

          leaveDays: {
            type: "integer",
            example: 1,
          },

          absentDays: {
            type: "integer",
            example: 2,
          },

          holidays: {
            type: "integer",
            example: 1,
          },

          weekends: {
            type: "integer",
            example: 9,
          },

          attendancePercentage: {
            type: "number",
            example: 83.33,
          },

          holidaysExcluded: {
            type: "boolean",
            example: true,
          },
        },
      },

      LeaveType: {
        type: "object",
        properties: {
          _id: {
            type: "string",
          },

          name: {
            type: "string",
            example: "Casual Leave",
          },

          code: {
            type: "string",
            example: "CL",
          },

          annualQuota: {
            type: "number",
            example: 12,
          },

          rules: {
            type: "object",
            properties: {
              allowNegativeBalance: {
                type: "boolean",
                example: false,
              },

              excludeWeekends: {
                type: "boolean",
                example: true,
              },

              excludeMandatoryHolidays: {
                type: "boolean",
                example: true,
              },

              allowHalfDay: {
                type: "boolean",
                example: true,
              },

              allowCancellation: {
                type: "boolean",
                example: true,
              },

              maxConsecutiveDays: {
                type: "number",
                example: 5,
              },

              minNoticeDays: {
                type: "number",
                example: 2,
              },
            },
          },

          status: {
            type: "string",
            enum: [
              "ACTIVE",
              "INACTIVE",
            ],
            example: "ACTIVE",
          },
        },
      },

      LeaveRequest: {
        type: "object",
        properties: {
          _id: {
            type: "string",
          },

          employeeId: {
            type: "string",
          },

          leaveTypeId: {
            type: "string",
          },

          fromDate: {
            type: "string",
            format: "date-time",
          },

          toDate: {
            type: "string",
            format: "date-time",
          },

          days: {
            type: "number",
            example: 3,
          },

          reason: {
            type: "string",
            example: "Family event",
          },

          status: {
            type: "string",
            enum: [
              "PENDING",
              "APPROVED",
              "REJECTED",
              "CANCELLED",
            ],
            example: "PENDING",
          },

          approvedBy: {
            type: "string",
            nullable: true,
          },

          approvedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },

          rejectionReason: {
            type: "string",
            nullable: true,
          },

          cancelledAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },

      LeaveBalance: {
        type: "object",
        properties: {
          _id: {
            type: "string",
          },

          employeeId: {
            type: "string",
          },

          leaveTypeId: {
            type: "string",
          },

          year: {
            type: "integer",
            example: 2026,
          },

          allocated: {
            type: "number",
            example: 12,
          },

          used: {
            type: "number",
            example: 3,
          },

          available: {
            type: "number",
            example: 9,
          },
        },
      },

      Holiday: {
        type: "object",
        properties: {
          _id: {
            type: "string",
          },

          name: {
            type: "string",
            example: "Independence Day",
          },

          date: {
            type: "string",
            format: "date-time",
          },

          optional: {
            type: "boolean",
            example: false,
          },

          description: {
            type: "string",
            example: "National Holiday",
          },

          createdBy: {
            type: "string",
          },
        },
      },

      AuditLog: {
        type: "object",
        properties: {
          _id: {
            type: "string",
          },

          actorId: {
            type: "string",
            nullable: true,
          },

          action: {
            type: "string",
            example: "LEAVE_APPROVED",
          },

          entityType: {
            type: "string",
            example: "LEAVE_REQUEST",
          },

          entityId: {
            type: "string",
          },

          oldValue: {
            type: "object",
            nullable: true,
          },

          newValue: {
            type: "object",
            nullable: true,
          },

          metadata: {
            type: "object",
            nullable: true,
          },

          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
    },
  },
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,

  apis: [
    "./src/routes/*.ts",
    "./dist/routes/*.js",
  ],
};

export const swaggerSpec =
  swaggerJSDoc(options);