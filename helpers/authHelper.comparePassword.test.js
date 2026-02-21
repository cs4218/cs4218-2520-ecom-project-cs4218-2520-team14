//Name: Shauryan Agrawal
//Student ID: A0265846N

import bcrypt from "bcrypt";
import { comparePassword } from "./authHelper.js";

jest.mock("bcrypt");

describe("comparePassword helper", () => {
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ================= VALID CASES ================= */

  it("returns true when password matches", async () => {
    bcrypt.compare.mockResolvedValue(true);

    const result = await comparePassword("password123", "hashed123");

    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "password123",
      "hashed123"
    );
  });

  it("returns false when password does not match", async () => {
    bcrypt.compare.mockResolvedValue(false);

    const result = await comparePassword("wrong", "hashed123");

    expect(result).toBe(false);
  });

  /* ================= PASSWORD VALIDATION ================= */

  it("throws when password is empty string", async () => {
    await expect(
      comparePassword("", "hashed123")
    ).rejects.toThrow("Password must be a non-empty string");

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("throws when password is undefined", async () => {
    await expect(
      comparePassword(undefined, "hashed123")
    ).rejects.toThrow("Password must be a non-empty string");
  });

  it("throws when password is not a string", async () => {
    await expect(
      comparePassword(123, "hashed123")
    ).rejects.toThrow("Password must be a non-empty string");
  });

  /* ================= HASH VALIDATION ================= */

  it("throws when hashedPassword is empty", async () => {
    await expect(
      comparePassword("password123", "")
    ).rejects.toThrow("Hashed password must be a non-empty string");

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("throws when hashedPassword is undefined", async () => {
    await expect(
      comparePassword("password123", undefined)
    ).rejects.toThrow("Hashed password must be a non-empty string");
  });

  it("throws when hashedPassword is not a string", async () => {
    await expect(
      comparePassword("password123", 12345)
    ).rejects.toThrow("Hashed password must be a non-empty string");
  });

  /* ================= ERROR PATH ================= */

  it("logs and rethrows bcrypt.compare errors", async () => {
    const error = new Error("compare failed");
    bcrypt.compare.mockRejectedValue(error);

    await expect(
      comparePassword("password123", "hashed123")
    ).rejects.toThrow("compare failed");

    expect(console.log).toHaveBeenCalledWith(error);
  });
});