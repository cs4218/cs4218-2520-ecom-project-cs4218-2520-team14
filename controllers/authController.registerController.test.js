import userModel from "../models/userModel.js";
import { registerController } from "./authController.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.mock("../helpers/authHelper.js", () => ({
  hashPassword: jest.fn(),
}));

jest.mock("../models/userModel.js", () => {
  const mockUserModel = jest.fn(); // constructor
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

describe("registerController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  const baseBody = {
    name: "John",
    email: "john@test.com",
    password: "pass123",
    phone: "123",
    address: "SG",
    answer: "Football",
  };

  it("400 when name missing", async () => {
    const req = makeReq({ body: { ...baseBody, name: "" } });
    const res = makeRes();
    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
  });

  it("400 when email missing", async () => {
    const req = makeReq({ body: { ...baseBody, email: "" } });
    const res = makeRes();
    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });
  });

  it("400 when password missing", async () => {
    const req = makeReq({ body: { ...baseBody, password: "" } });
    const res = makeRes();
    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Password is Required" });
  });

  it("400 when phone missing", async () => {
    const req = makeReq({ body: { ...baseBody, phone: "" } });
    const res = makeRes();
    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Phone no is Required" });
  });

  it("400 when address missing", async () => {
    const req = makeReq({ body: { ...baseBody, address: "" } });
    const res = makeRes();
    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });
  });

  it("400 when answer missing", async () => {
    const req = makeReq({ body: { ...baseBody, answer: "" } });
    const res = makeRes();
    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });
  });

  it("409 when user already exists", async () => {
    const req = makeReq({ body: baseBody });
    const res = makeRes();

    userModel.findOne.mockResolvedValue({ _id: "u1" });

    await registerController(req, res);

    expect(userModel.findOne).toHaveBeenCalledWith({ email: baseBody.email });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Already Register please login",
    });
  });

  it("201 registers new user (hash + save)", async () => {
    const req = makeReq({ body: baseBody });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed_pw");

    const savedUser = { _id: "u123", ...baseBody, password: "hashed_pw" };
    const saveMock = jest.fn().mockResolvedValue(savedUser);

    userModel.mockImplementation(() => ({ save: saveMock }));

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledWith(baseBody.password);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "User Register Successfully",
      user: savedUser,
    });
  });

  it("500 on unexpected error", async () => {
    const req = makeReq({ body: baseBody });
    const res = makeRes();

    userModel.findOne.mockRejectedValue(new Error("DB error"));

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Registration",
      error: expect.any(Error),
    });
  });
});
