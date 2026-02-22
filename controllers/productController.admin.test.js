// Jonas Ong, A0252052U

import {
  createProductController,
  updateProductController,
  deleteProductController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import fs from "fs";

const data = {
  params: { pid: "12345" },
  fields: {
    name: "TestProduct",
    description: "TestDescription",
    price: 10,
    category: "TestCategory",
    quantity: 5,
    shipping: true,
  },
  files: {
    photo: {
      size: 1024,
      name: "testphoto.jpg",
      type: "image/jpeg",
    },
  },
};
const res = {
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
};

describe("Product Controller", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("(Create)", () => {
    it("should error when creating a product without a name", async () => {
      const req = { ...data, fields: { ...data.fields, name: "" } };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Name is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when creating a product without a description", async () => {
      const req = { ...data, fields: { ...data.fields, description: "" } };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Description is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when creating a product without a price", async () => {
      const req = { ...data, fields: { ...data.fields, price: "" } };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Price is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when creating a product without a category", async () => {
      const req = { ...data, fields: { ...data.fields, category: "" } };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Category is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when creating a product without a quantity", async () => {
      const req = { ...data, fields: { ...data.fields, quantity: "" } };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Quantity is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error if creating a product with a photo larger than 1MB", async () => {
      const req = {
        ...data,
        files: {
          photo: { ...data.files.photo, size: 2 * 1024 * 1024 },
        },
      };

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Photo is Required and should be less then 1MB",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should create a new product without photo successfully", async () => {
      const req = { ...data, files: {} };

      const savedProduct = {
        ...req.fields,
        slug: req.fields.name,
      };
      jest
        .spyOn(productModel.prototype, "save")
        .mockResolvedValue(savedProduct);

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Created Successfully",
          products: expect.objectContaining({
            ...savedProduct,
            category: undefined,
          }),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should create a new product with photo successfully", async () => {
      const req = { ...data };

      const savedProduct = {
        ...req.fields,
        slug: req.fields.name,
        photo: {},
      };
      jest
        .spyOn(productModel.prototype, "save")
        .mockResolvedValue(savedProduct);
      jest.spyOn(fs, "readFileSync").mockReturnValue("filedata");

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Created Successfully",
          products: expect.objectContaining({
            ...savedProduct,
            category: undefined,
            photo: {
              data: expect.any(Buffer),
              contentType: req.files.photo.type,
            },
          }),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when database error occurs during product creation", async () => {
      const req = { ...data, files: {} };
      const error = new Error("Database Error");
      jest.spyOn(productModel.prototype, "save").mockRejectedValue(error);

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error,
          message: "Error in creating product",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("(Update)", () => {
    it("should error when updating a product without a name", async () => {
      const req = { ...data, fields: { ...data.fields, name: "" } };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Name is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when updating a product without a description", async () => {
      const req = { ...data, fields: { ...data.fields, description: "" } };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Description is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when updating a product without a price", async () => {
      const req = { ...data, fields: { ...data.fields, price: "" } };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Price is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when updating a product without a category", async () => {
      const req = { ...data, fields: { ...data.fields, category: "" } };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Category is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when updating a product without a quantity", async () => {
      const req = { ...data, fields: { ...data.fields, quantity: "" } };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Quantity is Required" }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error if updating a product with a photo larger than 1MB", async () => {
      const req = {
        ...data,
        fields: { ...data.fields },
        files: {
          photo: { ...data.files.photo, size: 2 * 1024 * 1024 },
        },
      };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Photo is Required and should be less then 1MB",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should update a product without photo successfully", async () => {
      const req = { ...data, files: {} };

      const updatedProduct = {
        ...req.fields,
        slug: req.fields.name,
      };
      jest.spyOn(productModel, "findByIdAndUpdate").mockResolvedValue({
        ...updatedProduct,
        save: jest.fn().mockResolvedValue(updatedProduct),
      });

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Updated Successfully",
          products: expect.objectContaining({
            ...updatedProduct,
          }),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should update a product with photo successfully", async () => {
      const req = { ...data };

      const updatedProduct = {
        ...req.fields,
        slug: req.fields.name,
        photo: {},
      };
      jest.spyOn(productModel, "findByIdAndUpdate").mockResolvedValue({
        ...updatedProduct,
        save: jest.fn().mockResolvedValue(updatedProduct),
      });
      jest.spyOn(fs, "readFileSync").mockReturnValue("filedata");

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Updated Successfully",
          products: expect.objectContaining({
            ...updatedProduct,
            photo: {
              data: "filedata",
              contentType: req.files.photo.type,
            },
          }),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when database error occurs during product update", async () => {
      const req = { ...data, files: {} };
      const error = new Error("Database Error");
      jest.spyOn(productModel, "findByIdAndUpdate").mockRejectedValue(error);

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error,
          message: "Error in updating product",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when updating a product that does not exist", async () => {
      const req = { ...data, params: { pid: "nonexistent" }, files: {} };
      jest.spyOn(productModel, "findByIdAndUpdate").mockResolvedValue(null);

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Product not found",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("(Delete)", () => {
    it("should error when deleting a product that does not exist", async () => {
      const req = { params: { pid: "nonexistent" } };
      jest
        .spyOn(productModel, "findByIdAndDelete")
        .mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Product not found",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should delete a product successfully", async () => {
      const req = { params: { pid: "existingid" } };
      jest
        .spyOn(productModel, "findByIdAndDelete")
        .mockReturnValue({ select: jest.fn().mockResolvedValue({}) });

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Deleted successfully",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should error when database error occurs during product deletion", async () => {
      const req = { params: { pid: "existingid" } };
      const error = new Error("Database Error");
      jest
        .spyOn(productModel, "findByIdAndDelete")
        .mockReturnValue({ select: jest.fn().mockRejectedValue(error) });

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error,
          message: "Error while deleting product",
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });
});
