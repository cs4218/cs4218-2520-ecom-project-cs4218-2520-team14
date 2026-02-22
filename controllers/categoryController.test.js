// Chia York Lim, A0258147X
import { singleCategoryController, categoryController } from "./categoryController";
import categoryModel from "../models/categoryModel";

jest.mock("../models/categoryModel");

describe("categoryController", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it("should be able to get all categories", async () => {
    // Arrange
    const mockCategories = [{ name: "Category1", slug: "category1" }, { name: "Category2", slug: "category2" }];
    categoryModel.find.mockResolvedValue(mockCategories);

    // Act
    await categoryController(req, res);

    // Assert
    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "All Categories List",
      category: mockCategories,
    });
  });

  it("should return empty array when there are no categories", async () => {
    // Arrange
    categoryModel.find.mockResolvedValue([]);

    // Act
    await categoryController(req, res);

    // Assert
    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "All Categories List",
      category: [],
    });
  });

  it("should handle errors for all categories and return 500 status", async () => {
    // Arrange
    const mockError = new Error("Database error");
    categoryModel.find.mockRejectedValue(mockError);

    // Act
    await categoryController(req, res);

    // Assert
    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Error while getting all categories",
    });
  });

  it("should return single category data when found", async () => {
    // Arrange
    const mockCategory = { name: "Test Category", slug: "test-category" };
    req = { params: { slug: "test-category" } };
    categoryModel.findOne.mockResolvedValue(mockCategory);

    // Act
    await singleCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "test-category" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Get Single Category Successfully",
      category: mockCategory,
    });
  });

  it("should return 404 when category is not found", async () => {
    // Arrange
    req = { params: { slug: "non-existent-category" } };
    categoryModel.findOne.mockResolvedValue(null);

    // Act
    await singleCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "non-existent-category" });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Category not found"
    });
  });

  it("should handle errors for single category and return 500 status", async () => {
    // Arrange
    const mockError = new Error("Database error");
    req = { params: { slug: "test-category" } };
    categoryModel.findOne.mockRejectedValue(mockError);

    // Act
    await singleCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "test-category" });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Error While getting Single Category",
    });
  });

});