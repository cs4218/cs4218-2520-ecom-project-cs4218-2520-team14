//Name: Shauryan Agrawal
//Student ID: A0265846N

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

const makeReq = (bodyOverrides = {}) => ({
  body: {
    name: "John",
    email: "john@test.com",
    password: "pass123",
    phone: "123",
    address: "SG",
    answer: "Football",
    ...bodyOverrides,
  },
});

describe("registerController (detailed 100% coverage)", () => {
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("400 when name missing (returns { error }) and does not call findOne/hash/save", async () => {
    const req = makeReq({ name: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled(); // constructor not invoked
  });

  it("400 when email missing (returns { message }) and does not call findOne/hash/save", async () => {
    const req = makeReq({ email: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  it("400 when password missing", async () => {
    const req = makeReq({ password: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Password is Required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  it("400 when phone missing", async () => {
    const req = makeReq({ phone: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Phone no is Required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  it("400 when address missing", async () => {
    const req = makeReq({ address: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  it("400 when answer missing", async () => {
    const req = makeReq({ answer: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  it("409 when user already exists (findOne called with email, does not hash or save)", async () => {
    const req = makeReq({ email: "exists@test.com" });
    const res = makeRes();

    userModel.findOne.mockResolvedValue({ _id: "u1" });

    await registerController(req, res);

    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOne).toHaveBeenCalledWith({ email: "exists@test.com" });

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Already Register please login",
    });

    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled(); // constructor not invoked
  });

  it("201 registers new user (hashPassword + new userModel(payload).save())", async () => {
    const req = makeReq({
      name: "Alice",
      email: "alice@test.com",
      password: "pw123",
      phone: "555",
      address: "SG",
      answer: "Blue",
    });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed_pw");

    const savedUser = {
      _id: "u123",
      name: "Alice",
      email: "alice@test.com",
      phone: "555",
      address: "SG",
      answer: "Blue",
      password: "hashed_pw",
    };

    const saveMock = jest.fn().mockResolvedValue(savedUser);
    userModel.mockImplementation(() => ({ save: saveMock }));

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledWith("pw123");

    // ensure constructor called with the exact payload in controller
    expect(userModel).toHaveBeenCalledTimes(1);
    expect(userModel).toHaveBeenCalledWith({
      name: "Alice",
      email: "alice@test.com",
      phone: "555",
      address: "SG",
      password: "hashed_pw",
      answer: "Blue",
    });

    expect(saveMock).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "User Register Successfully",
      user: savedUser,
    });
  });

  it("500 when findOne throws (logs + returns error object)", async () => {
    const req = makeReq({ email: "x@test.com" });
    const res = makeRes();

    const err = new Error("DB error");
    userModel.findOne.mockRejectedValue(err);

    await registerController(req, res);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Registration",
      error: err,
    });

    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled(); // constructor not invoked
  });

  it("500 when hashPassword throws (logs + returns error, does not save)", async () => {
    const req = makeReq({ email: "new@test.com" });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);

    const err = new Error("hash fail");
    hashPassword.mockRejectedValue(err);

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledTimes(1);
    expect(userModel).not.toHaveBeenCalled(); // save not reached

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Registration",
      error: err,
    });
  });

  it("500 when save throws (logs + returns error)", async () => {
    const req = makeReq({ email: "new2@test.com" });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashed_pw");

    const err = new Error("save fail");
    const saveMock = jest.fn().mockRejectedValue(err);
    userModel.mockImplementation(() => ({ save: saveMock }));

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledTimes(1);
    expect(userModel).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledTimes(1);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Registration",
      error: err,
    });
  });
});