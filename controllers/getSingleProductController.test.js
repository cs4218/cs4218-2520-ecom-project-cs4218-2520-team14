import { getSingleProductController } from "../controllers/productController";
import productModel from "../models/productModel";

// Mock productModel 
jest.mock("../models/productModel", () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
    },
}));

// Helper to create an Express-like res object
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res); // chainable
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("getSingleProductController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 1 - Success case
  test("should return 200 and single product payload on success", async () => {
    // Arrange
    const req = { params: { slug: "product-1" }};
    const res = makeRes();

    const fakeProduct = { _id: "p1", name: "A" };

    // Build the chained query mock:
    // findOne().select().populate().-> resolves to fakeProduct
    const populateMock = jest.fn().mockResolvedValue(fakeProduct);
    const selectMock = jest.fn(() => ({ populate: populateMock }));
    productModel.findOne.mockReturnValue({ select: selectMock });

    // Act
    await getSingleProductController(req, res);

    // Assert - response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Single Product Fetched",
      product: fakeProduct,
    });

    // Assert - query chain was called as expected 
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "product-1" });
    expect(populateMock).toHaveBeenCalledWith("category");
    expect(selectMock).toHaveBeenCalledWith("-photo");

  });

  // Test 2 - error path on model issue
  test("should return 500 and error payload when model throws", async () => {
    // Arrange
    const req = {  params: { slug: "product-1" } };
    const res = makeRes();

    const err = new Error("db blew up");
    // Make find throw immediately 
    productModel.findOne.mockImplementation(() => {
      throw err;
    });
    
    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting single product",
      error: "db blew up",
    });

  });
});