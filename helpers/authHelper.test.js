import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper.js";

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

describe("hashPassword", () => {
  it("returns a hashed value different from plaintext", async () => {
    bcrypt.hash.mockResolvedValue("hashed123");

    const result = await hashPassword("password123");

    expect(result).toBe("hashed123");
    expect(result).not.toBe("password123");
  });

  it("uses bcrypt with correct salt rounds (10)", async () => {
    bcrypt.hash.mockResolvedValue("hashed123");

    await hashPassword("password123");

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
  });

  it("throws when password is an empty string", async () => {
    await expect(hashPassword("")).rejects.toThrow(
      "Password must be a non-empty string"
    );
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("throws when password is not a string", async () => {
    await expect(hashPassword(null)).rejects.toThrow(
      "Password must be a non-empty string"
    );
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("rethrows when bcrypt.hash fails (and logs)", async () => {
    const err = new Error("bcrypt failed");
    bcrypt.hash.mockRejectedValue(err);

    await expect(hashPassword("password123")).rejects.toThrow("bcrypt failed");

    expect(console.log).toHaveBeenCalled(); // we don't care exact args
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
  });
});

describe("comparePassword", () => {
  it("returns true when correct password is provided", async () => {
    bcrypt.compare.mockResolvedValue(true);

    const result = await comparePassword("password123", "hashed123");

    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashed123");
  });

  it("returns false when incorrect password is provided", async () => {
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

  it("rethrows when bcrypt.compare fails (and logs)", async () => {
    const err = new Error("compare failed");
    bcrypt.compare.mockRejectedValue(err);

    await expect(
      comparePassword("password123", "hashed123")
    ).rejects.toThrow("compare failed");

    expect(console.log).toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashed123");
  });
});
