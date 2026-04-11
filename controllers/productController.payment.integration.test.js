// Name: Chia York Lim
// Student ID: A0258147X

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import orderModel from "../models/orderModel";
import JWT from "jsonwebtoken";
import request from "supertest";
import { getBraintreeGateway } from "./braintree.js";

jest.mock("../config/db.js", () => jest.fn());

jest.mock("./braintree.js", () => {
  return {
    getBraintreeGateway: jest.fn()
  };
});

describe("Product Controller - Payment Integration Test", () => {
  let mongoServer, userToken, userId, mockGateway;

  const JWT_SECRET = process.env.JWT_SECRET || "test_secret";

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    userId = new mongoose.Types.ObjectId();
    userToken = JWT.sign({ _id: userId, name: "Test User" }, JWT_SECRET, { expiresIn: "1h" });
  });

  beforeEach(() => {
    mockGateway = {
      clientToken: { generate: jest.fn() },
      transaction: { sale: jest.fn() },
    };
    getBraintreeGateway.mockReturnValue(mockGateway);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await orderModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should process payment and create order successfully", async () => {
    mockGateway.transaction.sale.mockImplementation((data, callback) => {
      callback(null, { success: true, transaction: { id: "fakeTransactionId" } });
    });

    const productId1 = new mongoose.Types.ObjectId();
    const productId2 = new mongoose.Types.ObjectId();

    const cart = [
      { _id: productId1, name: "Product 1", price: 10 },
      { _id: productId2, name: "Product 2", price: 20 },
    ];


    await request(app).post("/api/v1/product/braintree/payment")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ cart, nonce: "fake-valid-nonce" })
      .expect(200);

    expect(mockGateway.transaction.sale).toHaveBeenCalledWith(
      {
        amount: 30,
        paymentMethodNonce: "fake-valid-nonce",
        options: { submitForSettlement: true },
      },
      expect.any(Function)
    );

    const orders = await orderModel.find({ buyer: userId });
    expect(orders.length).toBe(1);
    expect(orders[0].products.map((id) => id.toString())).toEqual(
      expect.arrayContaining([productId1.toString(), productId2.toString()])
    );
  });

  it("should handle invalid cart data", async () => {
    await request(app).post("/api/v1/product/braintree/payment")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ cart: "Invalid Cart", nonce: "fake-valid-nonce" })
      .expect(400);
  });

  it("should handle invalid cart items (no _id)", async () => {
    const invalidCart = [
      { name: "Product 1", price: 10 }, // missing _id
      { _id: new mongoose.Types.ObjectId(), name: "Product 2", price: 20 },
    ];
    await request(app).post("/api/v1/product/braintree/payment")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ cart: invalidCart, nonce: "fake-valid-nonce" })
      .expect(400);
  });

  it("should handle invalid cart items (invalid price)", async () => {
    const invalidCart = [
      { _id: new mongoose.Types.ObjectId(), name: "Product 1", price: "invalid-price" }, // invalid price
      { _id: new mongoose.Types.ObjectId(), name: "Product 2", price: 20 },
    ];
    await request(app).post("/api/v1/product/braintree/payment")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ cart: invalidCart, nonce: "fake-valid-nonce" })
      .expect(400);
  });

  it("should handle authentication error (no token)", async () => {
    await request(app).post("/api/v1/product/braintree/payment")
      .send({ cart: [], nonce: "fake-valid-nonce" })
      .expect(401);
  });

  it("should handle authentication error (invalid token)", async () => {
    await request(app).post("/api/v1/product/braintree/payment")
      .set("Authorization", "Bearer invalid-token")
      .send({ cart: [], nonce: "fake-valid-nonce" })
      .expect(401);
  });

  it("should handle payment gateway error (server error)", async () => {
    const mockError = new Error("Payment gateway error");
    mockGateway.transaction.sale.mockImplementation((data, callback) => {
      callback(mockError, null);
    });

    await request(app).post("/api/v1/product/braintree/payment")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ cart: [{ _id: new mongoose.Types.ObjectId(), name: "Product 1", price: 10 }], nonce: "fake-valid-nonce" })
      .expect(500);

    const orders = await orderModel.find({ buyer: userId });
    expect(orders.length).toBe(0);
  });

  it("should handle payment gateway error (user error)", async () => {
    mockGateway.transaction.sale.mockImplementation((data, callback) => {
      callback(null, { success: false, message: "Payment failed" });
    });

    await request(app).post("/api/v1/product/braintree/payment")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ cart: [{ _id: new mongoose.Types.ObjectId(), name: "Product 1", price: 10 }], nonce: "fake-valid-nonce" })
      .expect(400);

    const orders = await orderModel.find({ buyer: userId });
    expect(orders.length).toBe(0);
  });
});