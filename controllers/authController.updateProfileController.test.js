//Teng Hui Xin Alicia, A0259064Y
import {
  updateProfileController,
} from "./authController.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../helpers/authHelper.js", () => ({
  __esModule: true,
  hashPassword: jest.fn(),
}));

jest.mock("../models/orderModel.js", () => ({
  __esModule: true,
  default: {},
}));

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("updateProfileController unit tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error json when password is provided but < 6 chars, and does not update", async () => {
    const req = {
      body: {
        name: "New Name",
        email: "ignored@example.com",
        password: "123",
        address: "New Address",
        phone: "999",
      },
      user: { _id: "user123" },
    };
    const res = makeRes();

    userModel.findById.mockResolvedValueOnce({
      _id: "user123",
      name: "Old Name",
      password: "old-hash",
      phone: "111",
      address: "Old Address",
    });

    await updateProfileController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      error: "Password is required and 6 character long",
    });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("updates profile without hashing when no password is provided (keeps existing password)", async () => {
    const req = {
      body: {
        name: "New Name",
        email: "ignored@example.com",
        password: "",
        address: "New Address",
        phone: "999",
      },
      user: { _id: "user123" },
    };
    const res = makeRes();

    const existingUser = {
      _id: "user123",
      name: "Old Name",
      password: "old-hash",
      phone: "111",
      address: "Old Address",
    };

    userModel.findById.mockResolvedValueOnce(existingUser);

    const updatedUser = {
      ...existingUser,
      name: "New Name",
      phone: "999",
      address: "New Address",
    };

    userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);

    await updateProfileController(req, res);

    expect(hashPassword).not.toHaveBeenCalled();

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "user123",
      {
        name: "New Name",
        password: "old-hash",
        phone: "999",
        address: "New Address",
      },
      { new: true },
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Profile Updated Successfully",
      updatedUser,
    });
  });

  it("hashes password and updates profile when valid password is provided", async () => {
    const req = {
      body: {
        name: "New Name",
        email: "ignored@example.com",
        password: "newPassword",
        address: "New Address",
        phone: "999",
      },
      user: { _id: "user123" },
    };

    const res = makeRes();

    const existingUser = {
      _id: "user123",
      name: "Old Name",
      password: "old-hash",
      phone: "111",
      address: "Old Address",
    };

    userModel.findById.mockResolvedValueOnce(existingUser);
    hashPassword.mockResolvedValueOnce("new-hash");

    const updatedUser = {
      ...existingUser,
      name: "New Name",
      password: "new-hash",
      phone: "999",
      address: "New Address",
    };

    userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);

    await updateProfileController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("newPassword");

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "user123",
      {
        name: "New Name",
        password: "new-hash",
        phone: "999",
        address: "New Address",
      },
      { new: true },
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Profile Updated Successfully",
      updatedUser,
    });
  });

  it("falls back to existing user fields when not provided", async () => {
    const req = {
      body: {
        password: undefined,
      },
      user: { _id: "user123" },
    };
    const res = makeRes();

    const existingUser = {
      _id: "user123",
      name: "Old Name",
      password: "old-hash",
      phone: "111",
      address: "Old Address",
    };

    userModel.findById.mockResolvedValueOnce(existingUser);

    const updatedUser = { ...existingUser };
    userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);

    await updateProfileController(req, res);

    expect(hashPassword).not.toHaveBeenCalled();

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "user123",
      {
        name: "Old Name",
        password: "old-hash",
        phone: "111",
        address: "Old Address",
      },
      { new: true },
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Profile Updated Successfully",
      updatedUser,
    });
  });

  it("handles errors by returning 400 with failure payload", async () => {
    const req = {
      body: { name: "New Name" },
      user: { _id: "user123" },
    };

    const res = makeRes();

    const err = new Error("DB down");
    userModel.findById.mockRejectedValueOnce(err);

    await updateProfileController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error While Updating Profile",
      error: err,
    });
  });
});