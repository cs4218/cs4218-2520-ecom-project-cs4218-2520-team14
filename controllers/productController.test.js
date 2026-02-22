// Author: Tan Qin Yong A0253468W
// Includes test files for most Product Controller (under Product feature in scope)

import { getProductController, getSingleProductController, productPhotoController, 
  productFiltersController, productCountController, productListController,
  searchProductController, relatedProductController, productCategoryController } from "../controllers/productController";
import productModel from "../models/productModel";
import categoryModel from "../models/categoryModel";

// Mock productModel 
jest.mock("../models/productModel", () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn()
    },
}));

// Mock categoryModel
jest.mock("../models/categoryModel", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

// Mock braintree
jest.mock("braintree", () => ({
  Environment: { Sandbox: "Sandbox" },
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
}));

// Helper to create an Express-like res object
function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res); 
  res.json = jest.fn().mockReturnValue(res);
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

describe("productFiltersController", () => {

  test("should filter by category when checked is non-empty and radio is empty", async () => {
    // Arrange
    const req = { body: { checked: ["cat1", "cat2"], radio: [] } };
    const res = makeRes();

    const fakeProducts = [{ _id: "p1" }];
    productModel.find.mockResolvedValue(fakeProducts);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({ category: ["cat1", "cat2"] });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: fakeProducts });
  });

  test("should filter by price when radio has range and checked is empty", async () => {
    // Arrange
    const req = { body: { checked: [], radio: [10, 50] } };
    const res = makeRes();

    const fakeProducts = [{ _id: "p2" }];
    productModel.find.mockResolvedValue(fakeProducts);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      price: { $gte: 10, $lte: 50 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: fakeProducts });
  });

  test("should filter by both category and price when both checked and radio are provided", async () => {
    // Arrange
    const req = { body: { checked: ["cat1"], radio: [100, 200] } };
    const res = makeRes();

    const fakeProducts = [{ _id: "p3" }];
    productModel.find.mockResolvedValue(fakeProducts);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      category: ["cat1"],
      price: { $gte: 100, $lte: 200 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: fakeProducts });
  });

  test("should pass empty args when checked and radio are both empty", async () => {
    // Arrange
    const req = { body: { checked: [], radio: [] } };
    const res = makeRes();

    const fakeProducts = [];
    productModel.find.mockResolvedValue(fakeProducts);

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: fakeProducts });
  });

  test("should return 400 when model throws", async () => {
    // Arrange
    const req = { body: { checked: ["cat1"], radio: [1, 2] } };
    const res = makeRes();

    const err = new Error("db blew up");
    productModel.find.mockRejectedValue(err);

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while filtering products",
      error: "db blew up", 
    });

    logSpy.mockRestore();
  });
});

describe("productCountController", () => {

  // Test 1 - Success case
  test("should return 200 and product count on success", async () => {
    // Arrange
    const res = makeRes();
    const req = {};

    const fakeCount = 100;

    // Build the chained query mock:
    // find().estimatedDocumentCount -> resolves to fakeCount
    const estimatedDocumentCountMock = jest.fn().mockResolvedValue(fakeCount);
    productModel.find.mockReturnValue({ estimatedDocumentCount: estimatedDocumentCountMock });

    // Act
    await productCountController(req, res);

    // Assert - response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      total: fakeCount,
    });

    // Assert - query chain was called as expected 
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(estimatedDocumentCountMock).toHaveBeenCalledWith();

  });

  // Test 2 - error path on model issue
  test("should return 400 and error payload when model throws", async () => {
    // Arrange
    const res = makeRes();
    const req = {};

    const err = new Error("db blew up");
    // Make find throw immediately 
    productModel.find.mockImplementation(() => {
      throw err;
    });
    
    // Act
    await productCountController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in product count",
      error: "db blew up",
    });

  });
});

describe("productListController", () => {

  test("should return 200 and products for a given page", async () => {
    // Arrange
    const req = { params: { page: 3 } }; 
    const res = makeRes();

    const fakeProducts = [{ _id: "p1" }, { _id: "p2" }];

    // find().select().skip().limit().sort() -> resolves fakeProducts
    const sortMock = jest.fn().mockResolvedValue(fakeProducts);
    const limitMock = jest.fn(() => ({ sort: sortMock }));
    const skipMock = jest.fn(() => ({ limit: limitMock }));
    const selectMock = jest.fn(() => ({ skip: skipMock }));
    productModel.find.mockReturnValue({ select: selectMock });

    // Act
    await productListController(req, res);

    // Assert - query chain 
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(skipMock).toHaveBeenCalledWith((3 - 1) * 6); // 12
    expect(limitMock).toHaveBeenCalledWith(6);
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });

    // Assert - response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: fakeProducts,
    });
  });

  test("should default page to 1 when req.params.page is missing", async () => {
    // Arrange
    const req = { params: {} };
    const res = makeRes();

    const fakeProducts = [];
    const sortMock = jest.fn().mockResolvedValue(fakeProducts);
    const limitMock = jest.fn(() => ({ sort: sortMock }));
    const skipMock = jest.fn(() => ({ limit: limitMock }));
    const selectMock = jest.fn(() => ({ skip: skipMock }));
    productModel.find.mockReturnValue({ select: selectMock });

    // Act
    await productListController(req, res);

    // Assert 
    expect(skipMock).toHaveBeenCalledWith(0);
    expect(limitMock).toHaveBeenCalledWith(6);

    // Assert - response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: fakeProducts,
    });
  });

  test("should return 400 when model throws", async () => {
    // Arrange
    const req = { params: { page: 2 } };
    const res = makeRes();

    const err = new Error("db blew up");
    productModel.find.mockImplementation(() => {
      throw err;
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await productListController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "error in per page ctrl",
      error: "db blew up", 
    });

    logSpy.mockRestore();
  });
});

describe("searchProductController", () => {

  test("should return json results when search succeeds", async () => {
    // Arrange
    const req = { params: { keyword: "shoe" } };
    const res = makeRes();

    const fakeResults = [{ _id: "p1", name: "Running Shoe" }];

    // find().select() -> resolves fakeResults
    const selectMock = jest.fn().mockResolvedValue(fakeResults);
    productModel.find.mockReturnValue({ select: selectMock });

    // Act
    await searchProductController(req, res);

    // Assert query object
    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "shoe", $options: "i" } },
        { description: { $regex: "shoe", $options: "i" } },
      ],
    });
    expect(selectMock).toHaveBeenCalledWith("-photo");

    // Assert response
    expect(res.json).toHaveBeenCalledWith(fakeResults);
  });

  test("should return 400 when model throws", async () => {
    // Arrange
    const req = { params: { keyword: "shoe" } };
    const res = makeRes();

    const err = new Error("db blew up");
    productModel.find.mockImplementation(() => {
      throw err;
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await searchProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error In Search Product API",
      error: "db blew up", 
    });

    logSpy.mockRestore();
  });
});

describe("relatedProductController", () => {

  test("should return 200 and related products on success", async () => {
    // Arrange
    const req = { params: { pid: "p1", cid: "c1" } };
    const res = makeRes();

    const fakeProducts = [{ _id: "p2" }, { _id: "p3" }];

    // find().select().limit().populate() -> resolves fakeProducts
    const populateMock = jest.fn().mockResolvedValue(fakeProducts);
    const limitMock = jest.fn(() => ({ populate: populateMock }));
    const selectMock = jest.fn(() => ({ limit: limitMock }));
    productModel.find.mockReturnValue({ select: selectMock });

    // Act
    await relatedProductController(req, res);

    // Assert - query chain
    expect(productModel.find).toHaveBeenCalledWith({
      category: "c1",
      _id: { $ne: "p1" },
    });
    expect(selectMock).toHaveBeenCalledWith("-photo");
    expect(limitMock).toHaveBeenCalledWith(3);
    expect(populateMock).toHaveBeenCalledWith("category");

    // Assert - response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: fakeProducts,
    });
  });

  test("should return 400 when pid or cid is missing (validation)", async () => {
    // Arrange: missing pid
    const req = { params: { cid: "c1" } };
    const res = makeRes();

    // Act
    await relatedProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "pid and cid are required",
    });

    expect(productModel.find).not.toHaveBeenCalled();
  });

  test("should return 400 and error message when model throws", async () => {
    // Arrange
    const req = { params: { pid: "p1", cid: "c1" } };
    const res = makeRes();

    const err = new Error("db blew up");
    productModel.find.mockImplementation(() => {
      throw err;
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await relatedProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "error while getting related product",
      error: "db blew up", 
    });

    logSpy.mockRestore();
  });
});

describe("productCategoryController", () => {

  test("should return 200 with category and products on success", async () => {
    // Arrange
    const req = { params: { slug: "tshirts" } };
    const res = makeRes();

    const fakeCategory = { _id: "c1", name: "T-Shirts", slug: "tshirts" };
    const fakeProducts = [{ _id: "p1" }, { _id: "p2" }];

    categoryModel.findOne.mockResolvedValue(fakeCategory);

    const populateMock = jest.fn().mockResolvedValue(fakeProducts);
    productModel.find.mockReturnValue({ populate: populateMock });

    // Act
    await productCategoryController(req, res);

    // Assert - model calls
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "tshirts" });
    expect(productModel.find).toHaveBeenCalledWith({ category: fakeCategory });
    expect(populateMock).toHaveBeenCalledWith("category");

    // Assert - response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: fakeCategory,
      products: fakeProducts,
    });
  });

  test("should return 404 when category is not found", async () => {
    // Arrange
    const req = { params: { slug: "does-not-exist" } };
    const res = makeRes();

    categoryModel.findOne.mockResolvedValue(null);

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "does-not-exist" });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Category not found",
    });

    expect(productModel.find).not.toHaveBeenCalled();
  });

  test("should return 400 when categoryModel throws", async () => {
    // Arrange
    const req = { params: { slug: "tshirts" } };
    const res = makeRes();

    const err = new Error("db blew up");
    categoryModel.findOne.mockRejectedValue(err);

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: "db blew up", 
      message: "Error While Getting products",
    });

    logSpy.mockRestore();
  });

  test("should return 400 when productModel throws", async () => {
    // Arrange
    const req = { params: { slug: "tshirts" } };
    const res = makeRes();

    const fakeCategory = { _id: "c1", name: "T-Shirts", slug: "tshirts" };
    categoryModel.findOne.mockResolvedValue(fakeCategory);

    const err = new Error("db blew up");
    productModel.find.mockImplementation(() => {
      throw err;
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: "db blew up",
      message: "Error While Getting products",
    });

    logSpy.mockRestore();
  });
});