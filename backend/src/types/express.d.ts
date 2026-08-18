export {};

declare global {
  namespace Express {
    interface User {
      userId: string;
      employeeCode: string;
      role: string;
    }
  }
}