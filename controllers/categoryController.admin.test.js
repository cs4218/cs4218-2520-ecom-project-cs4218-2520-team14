// Jonas Ong, A0252052U

import categoryModel from "../models/categoryModel.js";
import {
  createCategoryController,
  deleteCategoryController,
  updateCategoryController,
} from "./categoryController.js";

jest.spyOn(categoryModel, "findOne");
const res = {
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
};

describe("Category Controller", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("(New)", () => {
    it("should error when creating a category without a name", async () => {
      const req = { body: {} };

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Name is required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when creating a category that already exists", async () => {
      const req = { body: { name: "ExistingCategory" } };
      jest.spyOn(categoryModel, "findOne").mockResolvedValue(true);

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Category Already Exists",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should create a new category successfully", async () => {
      const req = { body: { name: "NewCategory" } };

      jest.spyOn(categoryModel, "findOne").mockResolvedValue(null);
      const category = { name: "NewCategory", slug: "newcategory" };
      jest.spyOn(categoryModel.prototype, "save").mockResolvedValue(category);

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "New category created",
          category: expect.objectContaining(category),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when database error occurs during category creation", async () => {
      const req = { body: { name: "NewCategory" } };
      const error = new Error("Database Error");

      jest.spyOn(categoryModel, "findOne").mockRejectedValue(error);

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error,
          message: "Error in Category",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("(Update)", () => {
    it("should error when updating a category that does not exist", async () => {
      const req = {
        body: { name: "UpdatedCategory" },
        params: { id: "nonexistentid" },
      };
      jest.spyOn(categoryModel, "findByIdAndUpdate").mockResolvedValue(null);

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Category not found",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should update a category successfully", async () => {
      const req = {
        body: { name: "UpdatedCategory" },
        params: { id: "existingid" },
      };
      const updatedCategory = {
        name: "UpdatedCategory",
        slug: "updatedcategory",
      };
      jest
        .spyOn(categoryModel, "findByIdAndUpdate")
        .mockResolvedValue(updatedCategory);

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Category Updated Successfully",
          category: expect.objectContaining(updatedCategory),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when database error occurs during category update", async () => {
      const req = {
        body: { name: "UpdatedCategory" },
        params: { id: "existingid" },
      };
      const error = new Error("Database Error");
      jest.spyOn(categoryModel, "findByIdAndUpdate").mockRejectedValue(error);

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error,
          message: "Error while updating category",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("(Delete)", () => {
    it("should error when deleting a category that does not exist", async () => {
      const req = { params: { id: "nonexistentid" } };
      jest.spyOn(categoryModel, "findByIdAndDelete").mockResolvedValue(null);

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Category not found",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should delete a category successfully", async () => {
      const req = { params: { id: "existingid" } };
      const deletedCategory = {
        name: "DeletedCategory",
        slug: "deletedcategory",
      };
      jest
        .spyOn(categoryModel, "findByIdAndDelete")
        .mockResolvedValue(deletedCategory);

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Category Deleted Successfully",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when database error occurs during category deletion", async () => {
      const req = { params: { id: "existingid" } };
      const error = new Error("Database Error");
      jest.spyOn(categoryModel, "findByIdAndDelete").mockRejectedValue(error);

      await deleteCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while deleting category",
          error,
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });
});
