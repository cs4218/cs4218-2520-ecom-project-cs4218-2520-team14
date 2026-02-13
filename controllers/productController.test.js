import { getProductController, getSingleProductController, productPhotoController } from "../controllers/productController";
import productModel from "../models/productModel";

// Mock productModel 
jest.mock("../models/productModel", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn()
    },
}));

// Helper to create an Express-like res object
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res); 
  return res;
}

// Silence console logs
let consoleSpy;

beforeEach(() => {
  consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
  jest.clearAllMocks();
});

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

describe("productPhotoController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 1 - Success case
  test("should return 200 and products photo data on success", async () => {
    // Arrange
    const pid = "67a21772a6d9e00ef2ac022a";
    const req = { params: { pid } }; 
    const res = makeRes();

    const fakePhoto = { 
        photo: { 
            data: Buffer.from("fake-image-bytes"), 
            contentType: "image/jpeg" 
        } 
    };

    // findById().select() -> resolves to fakePhoto
    const selectMock = jest.fn().mockResolvedValue(fakePhoto);
    productModel.findById.mockReturnValue({ select: selectMock });

    // Act
    await productPhotoController(req, res);

    // Assert - query
    expect(productModel.findById).toHaveBeenCalledWith(pid);
    expect(selectMock).toHaveBeenCalledWith("photo");

    // Assert - response
    expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg")
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(fakePhoto.photo.data);

  });

  // Test 2 - error path on model issue
  test("should return 500 and error message when model throws", async () => {
    // Arrange
    const pid = "67a21772a6d9e00ef2ac022a";
    const req = { params: { pid } };
    const res = makeRes();

    const err = new Error("db blew up");
    productModel.findById.mockImplementation(() => {
      throw err;
    });
    
    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while getting photo",
      error: "db blew up",
    });

  });

  // Test 3 - error path when product null or no photo
  test("should return 404 when product is null", async () => {
  // Arrange
  const pid = "67a21772a6d9e00ef2ac022a";
  const req = { params: { pid } };
  const res = makeRes();

  // Simulate product not found
  const selectMock = jest.fn().mockResolvedValue(null);
  productModel.findById.mockReturnValue({ select: selectMock });

  // Act
  await productPhotoController(req, res);

  // Assert
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith({
    success: false,
    message: "Photo not found",
  });
});
});