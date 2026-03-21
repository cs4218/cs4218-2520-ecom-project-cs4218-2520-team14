//Name: Shauryan Agrawal
//Student ID: A0265846N

import userModel from "../models/userModel.js";
import { registerController } from "./authController.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.mock("../helpers/authHelper.js", () => ({
  hashPassword: jest.fn(),
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

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("400 when name missing and does not call findOne/hash/save", async () => {
    const req = makeReq({ name: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is Required",
    });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("400 when email missing and does not call findOne/hash/save", async () => {
    const req = makeReq({ email: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Email is Required",
    });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("400 when password missing", async () => {
    const req = makeReq({ password: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Password is Required",
    });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("400 when phone missing", async () => {
    const req = makeReq({ phone: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Phone no is Required",
    });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("400 when address missing", async () => {
    const req = makeReq({ address: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Address is Required",
    });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("400 when answer missing", async () => {
    const req = makeReq({ answer: "" });
    const res = makeRes();

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Answer is Required",
    });

    expect(userModel.findOne).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
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
    expect(userModel).not.toHaveBeenCalled();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("201 registers new user (hashPassword + new userModel(payload).save()) and returns sanitized response", async () => {
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
      role: 0,
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
    };

    const saveMock = jest.fn().mockResolvedValue(savedUser);
    userModel.mockImplementation(() => ({ save: saveMock }));

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledWith("pw123");

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
      user: {
        _id: "u123",
        name: "Alice",
        email: "alice@test.com",
        phone: "555",
        address: "SG",
        answer: "Blue",
        role: 0,
        createdAt: "2026-03-21T00:00:00.000Z",
        updatedAt: "2026-03-21T00:00:00.000Z",
      },
    });
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("500 when findOne throws (logs + returns error.message)", async () => {
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
      error: "DB error",
    });

    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel).not.toHaveBeenCalled();
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("500 when hashPassword throws (logs + returns error.message, does not save)", async () => {
    const req = makeReq({ email: "new@test.com" });
    const res = makeRes();

    userModel.findOne.mockResolvedValue(null);

    const err = new Error("hash fail");
    hashPassword.mockRejectedValue(err);

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledTimes(1);
    expect(userModel).not.toHaveBeenCalled();

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Registration",
      error: "hash fail",
    });
  });

  //Name: Shauryan Agrawal
//Student ID: A0265846N
  it("500 when save throws (logs + returns error.message)", async () => {
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
      error: "save fail",
    });
  });
});