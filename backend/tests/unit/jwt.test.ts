import { generateAccessToken, verifyAccessToken } from "../../src/utils/jwt";

describe("JWT helpers", () => {
  it("issues and verifies a token using the configured secret", () => {
    const payload = {
      userId: "507f1f77bcf86cd799439011",
      employeeCode: "EMP-ADMIN",
      role: "ADMIN" as const,
    };

    expect(verifyAccessToken(generateAccessToken(payload))).toMatchObject(payload);
  });
});
