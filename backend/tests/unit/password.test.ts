import { hashPassword, comparePassword } from "../../src/utils/password";

describe("password utils", () => {
  const plaintext = "Secret123!";

  it("hashes a password into a bcrypt hash", async () => {
    const hash = await hashPassword(plaintext);
    expect(hash).not.toBe(plaintext);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("verifies a matching password", async () => {
    const hash = await hashPassword(plaintext);
    expect(await comparePassword(plaintext, hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword(plaintext);
    expect(await comparePassword("WrongPassword", hash)).toBe(false);
  });

  it("produces different hashes for the same input", async () => {
    const hash1 = await hashPassword(plaintext);
    const hash2 = await hashPassword(plaintext);
    expect(hash1).not.toBe(hash2);
  });
});
