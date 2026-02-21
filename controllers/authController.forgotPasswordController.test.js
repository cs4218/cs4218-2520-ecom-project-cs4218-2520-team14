//Name: Shauryan Agrawal
//Student ID: A0265846N

import userModel from "../models/userModel.js";
import { forgotPasswordController } from "./authController.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.mock("../helpers/authHelper.js", () => ({
  hashPassword: jest.fn(),
}));

jest.mock("../models/userModel.js", () => {
  const mockUserModel = jest.fn();
  mockUserModel.findOne = jest.fn();
  mockUserModel.findByIdAndUpdate = jest.fn();
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
    email: "x@test.com",
    answer: "Football",
    newPassword: "newpass",
    ...bodyOverrides,
  },
});

describe("forgotPasswordController (detailed 100% coverage)", () => {
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("400 if email missing (early return, no model/helper calls)", async () => {
    const req = makeReq({ email: "" });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("400 if answer missing (early return, no model/helper calls)", async () => {
    const req = makeReq({ answer: "" });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "answer is required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("400 if newPassword missing (early return, no model/helper calls)", async () => {
    const req = makeReq({ newPassword: "" });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "New Password is required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("404 if user not found (calls findOne with correct query, no update/hash)", async () => {
    const req = makeReq({ email: "x@test.com", answer: "bad", newPassword: "newpass" });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);

    await forgotPasswordController(req, res);

    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOne).toHaveBeenCalledWith({
      email: "x@test.com",
      answer: "bad",
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Wrong Email Or Answer",
    });

    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("200 resets password when user exists (exact calls + response)", async () => {
    const req = makeReq({ email: "x@test.com", answer: "Football", newPassword: "newpass" });
    const res = makeRes();

    userModel.findOne.mockResolvedValue({ _id: "u123" });
    hashPassword.mockResolvedValue("hashed_newpass");
    userModel.findByIdAndUpdate.mockResolvedValue({ _id: "u123" });

    await forgotPasswordController(req, res);

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: "x@test.com",
      answer: "Football",
    });

    expect(hashPassword).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledWith("newpass");

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("u123", {
      password: "hashed_newpass",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Password Reset Successfully",
    });
  });

  it("500 if hashPassword throws (covers catch after user found)", async () => {
    const req = makeReq();
    const res = makeRes();

    const err = new Error("hash failed");
    userModel.findOne.mockResolvedValue({ _id: "u123" });
    hashPassword.mockRejectedValue(err);

    await forgotPasswordController(req, res);

    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledTimes(1);

    // should not update if hashing failed
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Something went wrong",
      error: err,
    });
  });

  it("500 on exception from findOne (covers catch + logs error)", async () => {
    const req = makeReq();
    const res = makeRes();

    const err = new Error("DB error");
    userModel.findOne.mockRejectedValue(err);

    await forgotPasswordController(req, res);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Something went wrong",
      error: err,
    });

    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
