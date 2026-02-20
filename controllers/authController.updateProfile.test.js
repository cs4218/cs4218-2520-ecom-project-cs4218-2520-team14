import {
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "../controllers/authController.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
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
  default: {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
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

describe("getOrdersController unit tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns orders for the logged-in user and populates products and buyer", async () => {
    const req = { user: { _id: "user123" } };
    const res = makeRes();

    const orders = [
      { _id: "o1", buyer: { name: "Mina Sue" }, products: [{ _id: "p1" }] },
      { _id: "o2", buyer: { name: "Mina Sue" }, products: [{ _id: "p2" }] },
    ];

    const populateBuyer = jest.fn().mockResolvedValueOnce(orders);
    const populateProducts = jest.fn().mockReturnValueOnce({
      populate: populateBuyer,
    });

    orderModel.find.mockReturnValueOnce({
      populate: populateProducts,
    });

    await getOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });

    expect(populateProducts).toHaveBeenCalledWith("products", "-photo");
    expect(populateBuyer).toHaveBeenCalledWith("buyer", "name");
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("handles errors by returning 500 with error message", async () => {
    const req = { user: { _id: "user123" } };
    const res = makeRes();

    const err = new Error("DB down");

    orderModel.find.mockImplementationOnce(() => {
      throw err;
    });

    await getOrdersController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error While Getting Orders",
      error: err,
    });
  });
});

describe("getAllOrdersController unit tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns all orders sorted by createdAt descending", async () => {
    const req = {};
    const res = makeRes();

    const orders = [
      { _id: "o2", createdAt: "2026-02-19" },
      { _id: "o1", createdAt: "2026-02-18" },
    ];
    const sortMock = jest.fn().mockResolvedValueOnce(orders);

    const populateBuyerMock = jest.fn().mockReturnValueOnce({
      sort: sortMock,
    });

    const populateProductsMock = jest.fn().mockReturnValueOnce({
      populate: populateBuyerMock,
    });

    orderModel.find.mockReturnValueOnce({
      populate: populateProductsMock,
    });

    await getAllOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(populateProductsMock).toHaveBeenCalledWith("products", "-photo");
    expect(populateBuyerMock).toHaveBeenCalledWith("buyer", "name");
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });

    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("handles errors by returning 500", async () => {
    const req = {};
    const res = makeRes();

    const err = new Error("DB failure");

    orderModel.find.mockImplementationOnce(() => {
      throw err;
    });

    await getAllOrdersController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error While Getting Orders",
      error: err,
    });
  });
});
describe("orderStatusController unit tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates order status and returns updated order", async () => {
    const req = {
      params: { orderId: "order123" },
      body: { status: "Shipped" },
    };
    const res = makeRes();

    const updatedOrder = {
      _id: "order123",
      status: "Shipped",
      buyer: "user1",
      products: ["p1"],
    };

    orderModel.findByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

    await orderStatusController(req, res);

    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "order123",
      { status: "Shipped" },
      { new: true },
    );

    expect(res.json).toHaveBeenCalledWith(updatedOrder);
  });

  it("handles errors by returning 500 with failure payload", async () => {
    const req = {
      params: { orderId: "order123" },
      body: { status: "Shipped" },
    };
    const res = makeRes();

    const err = new Error("DB down");
    orderModel.findByIdAndUpdate.mockRejectedValueOnce(err);

    await orderStatusController(req, res);

    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "order123",
      { status: "Shipped" },
      { new: true },
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error While Updating Order",
      error: err,
    });
  });
});
