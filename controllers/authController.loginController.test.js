import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { loginController } from "./authController.js";
import { comparePassword } from "../helpers/authHelper.js";

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

jest.mock("../helpers/authHelper.js", () => ({
  comparePassword: jest.fn(),
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

const makeReq = (overrides = {}) => ({ body: {}, ...overrides });

describe("loginController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.JWT_SECRET = "test_secret";
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("400 when both missing", async () => {
    const req = makeReq({ body: { email: "", password: "" } });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid email or password",
    });
  });

  it("400 when email missing only", async () => {
    const req = makeReq({ body: { email: "", password: "p" } });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("400 when password missing only", async () => {
    const req = makeReq({ body: { email: "x@test.com", password: "" } });
    const res = makeRes();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404 when email not registered", async () => {
    const req = makeReq({ body: { email: "x@test.com", password: "p" } });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);

    await loginController(req, res);

    expect(userModel.findOne).toHaveBeenCalledWith({ email: "x@test.com" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Email is not registerd",
    });
  });

  it("401 when password incorrect", async () => {
    const req = makeReq({ body: { email: "x@test.com", password: "wrong" } });
    const res = makeRes();

    userModel.findOne.mockResolvedValue({ _id: "u1", password: "hashed" });
    comparePassword.mockResolvedValue(false);

    await loginController(req, res);

    expect(comparePassword).toHaveBeenCalledWith("wrong", "hashed");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Invalid Password",
    });
  });

  it("200 success returns token", async () => {
    const req = makeReq({ body: { email: "x@test.com", password: "ok" } });
    const res = makeRes();

    const foundUser = {
      _id: "u123",
      name: "John",
      email: "x@test.com",
      phone: "123",
      address: "SG",
      role: 0,
      password: "hashed",
    };

    userModel.findOne.mockResolvedValue(foundUser);
    comparePassword.mockResolvedValue(true);
    JWT.sign.mockReturnValue("jwt_token");

    await loginController(req, res);

    expect(JWT.sign).toHaveBeenCalledWith(
      { _id: "u123" },
      "test_secret",
      { expiresIn: "7d" }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "login successfully",
      user: {
        _id: "u123",
        name: "John",
        email: "x@test.com",
        phone: "123",
        address: "SG",
        role: 0,
      },
      token: "jwt_token",
    });
  });

  it("500 on unexpected error", async () => {
    const req = makeReq({ body: { email: "x@test.com", password: "p" } });
    const res = makeRes();

    userModel.findOne.mockRejectedValue(new Error("DB error"));

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in login",
      error: expect.any(Error),
    });
  });
});
