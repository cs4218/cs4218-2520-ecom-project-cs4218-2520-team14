//Name: Shauryan Agrawal
//Student ID: A0265846N

import userModel from "../models/userModel.js";
import { loginController } from "./authController.js";
import { comparePassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

jest.mock("../helpers/authHelper.js", () => ({
  comparePassword: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

jest.mock("../models/userModel.js", () => {
  const mockUserModel = jest.fn();
  mockUserModel.findOne = jest.fn();
  return { __esModule: true, default: mockUserModel };
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (bodyOverrides = {}) => ({
  body: {
    email: "test@example.com",
    password: "pass123",
    ...bodyOverrides,
  },
});

describe("loginController (detailed 100% coverage)", () => {
  let logSpy;
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // ensure deterministic env for JWT.sign call
    process.env = { ...OLD_ENV, JWT_SECRET: "unit_test_secret" };
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.env = OLD_ENV;
  });

  it("400 when email is missing (early return, no DB / helper / JWT calls)", async () => {
    const req = makeReq({ email: "" });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email or password",
    });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(comparePassword).not.toHaveBeenCalled();
    expect(JWT.sign).not.toHaveBeenCalled();
  });

  it("400 when password is missing (early return, no DB / helper / JWT calls)", async () => {
    const req = makeReq({ password: "" });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email or password",
    });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(comparePassword).not.toHaveBeenCalled();
    expect(JWT.sign).not.toHaveBeenCalled();
  });

  it("404 when user is not found (findOne called with correct query, no compare/JWT)", async () => {
    const req = makeReq({ email: "missing@x.com", password: "pass123" });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);

    await loginController(req, res);

    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOne).toHaveBeenCalledWith({ email: "missing@x.com" });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Email is not registerd",
    });

    expect(comparePassword).not.toHaveBeenCalled();
    expect(JWT.sign).not.toHaveBeenCalled();
  });

  it("401 when password does not match (comparePassword called with correct args, no JWT)", async () => {
    const req = makeReq({ email: "a@b.com", password: "wrong" });
    const res = makeRes();

    const user = {
      _id: "u1",
      name: "Alice",
      email: "a@b.com",
      phone: "999",
      address: "SG",
      role: 0,
      password: "hashed_pw",
    };

    userModel.findOne.mockResolvedValue(user);
    comparePassword.mockResolvedValue(false);

    await loginController(req, res);

    expect(userModel.findOne).toHaveBeenCalledWith({ email: "a@b.com" });

    expect(comparePassword).toHaveBeenCalledTimes(1);
    expect(comparePassword).toHaveBeenCalledWith("wrong", "hashed_pw");

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid Password",
    });

    expect(JWT.sign).not.toHaveBeenCalled();
  });

  it("200 when login succeeds (JWT.sign args + response shape excludes password)", async () => {
    const req = makeReq({ email: "ok@x.com", password: "pass123" });
    const res = makeRes();

    const user = {
      _id: "u123",
      name: "John",
      email: "ok@x.com",
      phone: "123",
      address: "Singapore",
      role: 1,
      password: "hashed_pw",
    };

    userModel.findOne.mockResolvedValue(user);
    comparePassword.mockResolvedValue(true);
    JWT.sign.mockReturnValue("signed_token");

    await loginController(req, res);

    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOne).toHaveBeenCalledWith({ email: "ok@x.com" });

    expect(comparePassword).toHaveBeenCalledTimes(1);
    expect(comparePassword).toHaveBeenCalledWith("pass123", "hashed_pw");

    expect(JWT.sign).toHaveBeenCalledTimes(1);
    expect(JWT.sign).toHaveBeenCalledWith(
      { _id: "u123" },
      "unit_test_secret",
      { expiresIn: "7d" }
    );

    expect(res.status).toHaveBeenCalledWith(200);

    // Ensure returned user object is the picked fields (no password)
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "login successfully",
      user: {
        _id: "u123",
        name: "John",
        email: "ok@x.com",
        phone: "123",
        address: "Singapore",
        role: 1,
      },
      token: "signed_token",
    });

    // Extra safety: make sure password isn't accidentally returned
    const payload = res.send.mock.calls[0][0];
    expect(payload.user.password).toBeUndefined();
  });

  it("500 when userModel.findOne throws (logs + returns 500, no compare/JWT)", async () => {
    const req = makeReq({ email: "x@test.com", password: "pass123" });
    const res = makeRes();

    const err = new Error("DB down");
    userModel.findOne.mockRejectedValue(err);

    await loginController(req, res);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in login",
      error: err,
    });

    expect(comparePassword).not.toHaveBeenCalled();
    expect(JWT.sign).not.toHaveBeenCalled();
  });

  it("500 when comparePassword throws (logs + returns 500, no JWT)", async () => {
    const req = makeReq({ email: "x@test.com", password: "pass123" });
    const res = makeRes();

    const user = {
      _id: "u9",
      name: "X",
      email: "x@test.com",
      phone: "0",
      address: "0",
      role: 0,
      password: "hashed_pw",
    };

    userModel.findOne.mockResolvedValue(user);

    const err = new Error("bcrypt fail");
    comparePassword.mockRejectedValue(err);

    await loginController(req, res);

    expect(comparePassword).toHaveBeenCalledWith("pass123", "hashed_pw");
    expect(JWT.sign).not.toHaveBeenCalled();

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in login",
      error: err,
    });
  });

  it("500 when JWT.sign throws (logs + returns 500)", async () => {
    const req = makeReq({ email: "ok@x.com", password: "pass123" });
    const res = makeRes();

    const user = {
      _id: "u123",
      name: "John",
      email: "ok@x.com",
      phone: "123",
      address: "Singapore",
      role: 1,
      password: "hashed_pw",
    };

    userModel.findOne.mockResolvedValue(user);
    comparePassword.mockResolvedValue(true);

    const err = new Error("jwt fail");
    JWT.sign.mockImplementation(() => {
      throw err;
    });

    await loginController(req, res);

    expect(JWT.sign).toHaveBeenCalledTimes(1);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in login",
      error: err,
    });
  });
});
