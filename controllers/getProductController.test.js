import { getProductController } from "../controllers/productController";
import productModel from "../models/productModel";

// Mock productModel 
jest.mock("../models/productModel", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
    },
}));

// Helper to create an Express-like res object
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res); // chainable
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("getProductController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 1 - Success case
  test("should return 200 and products payload on success", async () => {
    // Arrange
    const req = {};
    const res = makeRes();

    const fakeProducts = [
      { _id: "p1", name: "A" },
      { _id: "p2", name: "B" },
    ];

    // Build the chained query mock:
    // find().populate().select().limit().sort() -> resolves to fakeProducts
    const sortMock = jest.fn().mockResolvedValue(fakeProducts);
    const limitMock = jest.fn(() => ({ sort: sortMock }));
    const selectMock = jest.fn(() => ({ limit: limitMock }));
    const populateMock = jest.fn(() => ({ select: selectMock }));
    productModel.find.mockReturnValue({ populate: populateMock });

    // Act
    await getProductController(req, res);

    // Assert - response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      countTotal: fakeProducts.length,
      message: "AllProducts ",
      products: fakeProducts,
    });

    // Assert - query chain was called as expected 
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(populateMock).toHaveBeenCalledWith("category");
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(limitMock).toHaveBeenCalledWith(12);
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
  });

  // Test 2 - error path on model issue
  test("should return 500 and error payload when model throws", async () => {
    // Arrange
    const req = {};
    const res = makeRes();

    const err = new Error("db blew up");
    // Make find throw immediately 
    productModel.find.mockImplementation(() => {
      throw err;
    });
    
    // Act
    await getProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in getting products",
      error: "db blew up",
    });

  });
});