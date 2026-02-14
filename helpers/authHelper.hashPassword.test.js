import bcrypt from "bcrypt";
import { hashPassword } from "./authHelper.js";

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
  it("returns hashed value", async () => {
    bcrypt.hash.mockResolvedValue("hashed123");

    const result = await hashPassword("password123");

    expect(result).toBe("hashed123");
    expect(result).not.toBe("password123");
  });

  it("uses bcrypt with salt rounds = 10", async () => {
    bcrypt.hash.mockResolvedValue("hashed123");

    await hashPassword("password123");

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
  });

  it("throws when password is empty", async () => {
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

  it("rethrows bcrypt errors (and logs)", async () => {
    const err = new Error("bcrypt failed");
    bcrypt.hash.mockRejectedValue(err);

    await expect(hashPassword("password123")).rejects.toThrow("bcrypt failed");

    expect(console.log).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
  });
});
