// Chia York Lim, A0258147X
import { braintreeTokenController, brainTreePaymentController } from "./productController";
import braintree from "braintree";
import orderModel from "../models/orderModel";

jest.mock("braintree", () => {
  return {
    Environment: {
      Sandbox: "Sandbox",
    },
    BraintreeGateway: jest.fn().mockImplementation(function () {
      this.clientToken = {
        generate: jest.fn(),
      };
      this.transaction = {
        sale: jest.fn(),
      };
    }),
  };
});

jest.mock("../models/orderModel", () => {
  return jest.fn().mockImplementation(function () {
    this.save = jest.fn().mockResolvedValue(true);
  });
});

const mockGateway = braintree.BraintreeGateway.mock.instances[0];

let req, res;

describe("Product Payment Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  it("should generate a braintree token successfully", async () => {
    mockGateway.clientToken.generate.mockImplementation((options, callback) => {
      callback(null, { clientToken: "mocked-client-token" });
    });

    await braintreeTokenController(req, res);

    expect(mockGateway.clientToken.generate).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith({ clientToken: "mocked-client-token" });
  });

  it("should handle error when generating braintree token", async () => {
    const mockError = new Error("Token generation failed");
    mockGateway.clientToken.generate.mockImplementation((options, callback) => {
      callback(mockError, null);
    });

    await braintreeTokenController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(mockError);
  });

  it("should be able to handle exception in calling clientToken.generate", async () => {
    const mockError = new Error("Unexpected error");
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    mockGateway.clientToken.generate.mockImplementation(() => {
      throw mockError;
    });

    await braintreeTokenController(req, res);

    expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(mockError);
    consoleLogSpy.mockRestore();
  });

  it("should be able to handle payment successfully", async () => {
    const mockCart = [{ price: 10 }, { price: 20 }];
    mockGateway.transaction.sale.mockImplementation((transactionDetails, callback) => {
      callback(null, { success: true });
    });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: mockCart } };
    await brainTreePaymentController(req, res);

    expect(mockGateway.transaction.sale).toHaveBeenCalledWith(
      {
        amount: 30,
        paymentMethodNonce: "mocked-nonce",
        options: {
          submitForSettlement: true,
        },
      },
      expect.any(Function)
    );
    expect(orderModel).toHaveBeenCalledWith({
      products: mockCart,
      payment: { success: true },
      buyer: "mocked-user-id",
    });
    const mockOrderInstance = orderModel.mock.instances[0];
    expect(mockOrderInstance.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("should be able to handle payment failure but not an error", async () => {
    const mockCart = [{ price: 10 }, { price: 20 }];
    mockGateway.transaction.sale.mockImplementation((transactionDetails, callback) => {
      callback(null, { success: false, message: "Payment failed" });
    });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: mockCart } };
    await brainTreePaymentController(req, res);
    expect(mockGateway.transaction.sale).toHaveBeenCalledWith(
      {
        amount: 30,
        paymentMethodNonce: "mocked-nonce",
        options: {
          submitForSettlement: true,
        },
      },
      expect.any(Function)
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ success: false, message: "Payment failed" });
  });

  // Frontend should prevent user from proceeding to payment if cart is empty,
  // but we should still test that the backend can handle this scenario gracefully 
  // without throwing an error.
  it("should be able to handle empty cart and process payment", async () => {
    mockGateway.transaction.sale.mockImplementation((transactionDetails, callback) => {
      callback(null, { success: true });
    });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: [] } };
    await brainTreePaymentController(req, res);
    expect(mockGateway.transaction.sale).toHaveBeenCalledWith(
      {
        amount: 0,
        paymentMethodNonce: "mocked-nonce",
        options: {
          submitForSettlement: true,
        },
      },
      expect.any(Function)
    );
    expect(orderModel).toHaveBeenCalledWith({
      products: [],
      payment: { success: true },
      buyer: "mocked-user-id",
    });
    const mockOrderInstance = orderModel.mock.instances[0];
    expect(mockOrderInstance.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("should handle invalid cart data", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: "invalid-cart-data" } };
    await brainTreePaymentController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Invalid cart data" });
    consoleSpy.mockRestore();
  });

  it("should handle invalid cart item", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: ["test"] } };
    await brainTreePaymentController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Invalid cart item" });
    consoleSpy.mockRestore();
  });

  it("should handle invalid price in cart item", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: [{ price: "invalid-price" }] } };
    await brainTreePaymentController(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Invalid cart item" });
    consoleSpy.mockRestore();
  });

  it("should handle error when processing payment", async () => {
    const mockError = new Error("Payment processing failed");
    mockGateway.transaction.sale.mockImplementation((transactionDetails, callback) => {
      callback(mockError, null);
    });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: [{ price: 10 }] } };
    await brainTreePaymentController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(mockError);
  });

  it("should handle error when creating order model", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    const mockError = new Error("Constructor error");
    mockGateway.transaction.sale.mockImplementation((details, callback) => {
      callback(null, { success: true });
    });
    orderModel.mockImplementationOnce(() => { throw mockError; });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: [{ price: 10 }] } };

    await brainTreePaymentController(req, res);

    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(mockError);
    consoleSpy.mockRestore();
  });

  it("should handle error when saving order after successful payment", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    const mockError = new Error("Database error");
    mockGateway.transaction.sale.mockImplementation((transactionDetails, callback) => {
      callback(null, { success: true });
    });
    // orderModel.save() is asynchrous, but Jest crashes if asynchrous exception is not caught
    orderModel.mockImplementation(function () {
      this.save = jest.fn().mockRejectedValue(mockError);
    });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: [{ price: 10 }] } };
    await brainTreePaymentController(req, res);
    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(mockError);
    consoleSpy.mockRestore();
  });

  it("should be able to handle exception in calling transaction.sale", async () => {
    const mockError = new Error("Unexpected error");
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    mockGateway.transaction.sale.mockImplementation(() => {
      throw mockError;
    });
    req = { user: { _id: "mocked-user-id" }, body: { nonce: "mocked-nonce", cart: [{ price: 10 }] } };
    await brainTreePaymentController(req, res);

    expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(mockError);
    consoleLogSpy.mockRestore();
  });
});
