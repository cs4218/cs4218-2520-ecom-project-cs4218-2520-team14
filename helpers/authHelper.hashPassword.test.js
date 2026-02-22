//Name: Shauryan Agrawal
//Student ID: A0265846N

import bcrypt from "bcrypt";
import { hashPassword } from "./authHelper.js";

jest.mock("bcrypt");

describe("hashPassword helper", () => {
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ================= SUCCESS PATH ================= */

  it("returns hashed value from bcrypt.hash", async () => {
    bcrypt.hash.mockResolvedValue("hashed123");

    const result = await hashPassword("password123");

    expect(result).toBe("hashed123");
    expect(result).not.toBe("password123");
    expect(bcrypt.hash).toHaveBeenCalledTimes(1);
  });

  it("calls bcrypt.hash with salt rounds = 10", async () => {
    bcrypt.hash.mockResolvedValue("hashed123");

    await hashPassword("password123");

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
  });

  /* ================= INPUT VALIDATION ================= */

  it("throws when password is empty string", async () => {
    await expect(hashPassword("")).rejects.toThrow(
      "Password must be a non-empty string"
    );

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("throws when password is undefined", async () => {
    await expect(hashPassword(undefined)).rejects.toThrow(
      "Password must be a non-empty string"
    );

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("throws when password is null", async () => {
    await expect(hashPassword(null)).rejects.toThrow(
      "Password must be a non-empty string"
    );

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("throws when password is not a string (number)", async () => {
    await expect(hashPassword(12345)).rejects.toThrow(
      "Password must be a non-empty string"
    );

    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  /* ================= ERROR PATH ================= */

  it("logs and rethrows bcrypt.hash errors", async () => {
    const error = new Error("bcrypt failed");
    bcrypt.hash.mockRejectedValue(error);

    await expect(hashPassword("password123")).rejects.toThrow("bcrypt failed");

    expect(console.log).toHaveBeenCalledWith(error);
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
  });
});