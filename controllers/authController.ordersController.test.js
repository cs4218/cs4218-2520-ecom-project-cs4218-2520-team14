//Teng Hui Xin Alicia, A0259064Y
import {
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "../controllers/authController.js";
import orderModel from "../models/orderModel.js";

jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: {},
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
