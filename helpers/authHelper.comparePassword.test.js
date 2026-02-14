import bcrypt from "bcrypt";
import { comparePassword } from "./authHelper.js";

jest.mock("bcrypt");

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("comparePassword", () => {
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
    expect(bcrypt.compare).toHaveBeenCalledWith("wrong", "hashed123");
  });

  it("throws when password is empty", async () => {
    await expect(comparePassword("", "hashed123")).rejects.toThrow(
      "Password must be a non-empty string"
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("throws when hashedPassword is empty", async () => {
    await expect(comparePassword("password123", "")).rejects.toThrow(
      "Hashed password must be a non-empty string"
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("throws when hashedPassword is not a string", async () => {
    await expect(comparePassword("password123", undefined)).rejects.toThrow(
      "Hashed password must be a non-empty string"
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
  

  it("rethrows bcrypt.compare errors (and logs)", async () => {
    const err = new Error("compare failed");
    bcrypt.compare.mockRejectedValue(err);

    await expect(
      comparePassword("password123", "hashed123")
    ).rejects.toThrow("compare failed");

    expect(console.log).toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "password123",
      "hashed123"
    );
  });
});
