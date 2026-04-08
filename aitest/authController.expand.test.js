import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import { registerController, loginController, forgotPasswordController, updateProfileController, getOrdersController, getAllOrdersController, orderStatusController, getAllUsersController } from "../controllers/authController.js";
import JWT from "jsonwebtoken";

jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

describe("Controller Coverage Expansion Suite", () => {
  let req, res;
  beforeEach(() => {
    req = { body: {}, params: {}, user: { _id: "user123" } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  test("registerController: catches database errors (500)", async () => {
    userModel.findOne.mockRejectedValue(new Error("DB Fail"));
    await registerController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("loginController: catches database errors (500)", async () => {
    req.body = { email: "a@a.com", password: "123" };
    userModel.findOne.mockRejectedValue(new Error("DB Fail"));
    await loginController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("forgotPasswordController: catches database errors (500)", async () => {
    req.body = { email: "a@a.com", answer: "cat", newPassword: "new" };
    userModel.findOne.mockRejectedValue(new Error("DB Fail"));
    await forgotPasswordController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("updateProfileController: handles password length validation error", async () => {
    req.body = { password: "123" };
    userModel.findById.mockResolvedValue({ _id: "user123" });
    await updateProfileController(req, res);
    expect(res.json).toHaveBeenCalledWith({ error: "Password is required and 6 character long" });
  });

  test("updateProfileController: catches errors (400)", async () => {
    userModel.findById.mockRejectedValue(new Error("Fail"));
    await updateProfileController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("getOrdersController: catches database errors (500)", async () => {
    orderModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      populate: jest.fn().mockRejectedValue(new Error("DB Fail")),
    });
    await getOrdersController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("getAllOrdersController: catches database errors (500)", async () => {
    orderModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockRejectedValue(new Error("DB Fail")),
    });
    await getAllOrdersController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("orderStatusController: catches database errors (500)", async () => {
    req.params.orderId = "1";
    orderModel.findByIdAndUpdate.mockRejectedValue(new Error("DB Fail"));
    await orderStatusController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test("getAllUsersController: catches database errors (500)", async () => {
    userModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockRejectedValue(new Error("DB Fail")),
    });
    await getAllUsersController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});