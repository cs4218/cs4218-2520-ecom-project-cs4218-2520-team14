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

const makeReq = (overrides = {}) => ({ body: {}, ...overrides });

describe("forgotPasswordController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("400 if email missing", async () => {
    const req = makeReq({ body: { email: "", answer: "Football", newPassword: "x" } });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it("400 if answer missing", async () => {
    const req = makeReq({ body: { email: "x@test.com", answer: "", newPassword: "x" } });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "answer is required" });
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it("400 if newPassword missing", async () => {
    const req = makeReq({ body: { email: "x@test.com", answer: "Football", newPassword: "" } });
    const res = makeRes();

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "New Password is required" });
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it("404 if user not found", async () => {
    const req = makeReq({ body: { email: "x@test.com", answer: "bad", newPassword: "newpass" } });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Wrong Email Or Answer",
    });
  });

  it("200 resets password when user exists", async () => {
    const req = makeReq({ body: { email: "x@test.com", answer: "Football", newPassword: "newpass" } });
    const res = makeRes();

    userModel.findOne.mockResolvedValue({ _id: "u123" });
    hashPassword.mockResolvedValue("hashed_new");
    userModel.findByIdAndUpdate.mockResolvedValue({ _id: "u123" });

    await forgotPasswordController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("newpass");
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("u123", {
      password: "hashed_new",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Password Reset Successfully",
    });
  });

  it("500 on exception", async () => {
    const req = makeReq({ body: { email: "x@test.com", answer: "Football", newPassword: "newpass" } });
    const res = makeRes();

    userModel.findOne.mockRejectedValue(new Error("DB error"));

    await forgotPasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Something went wrong",
      error: expect.any(Error),
    });
  });
});
