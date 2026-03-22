// Jonas Ong, A0252052U

import fs from "fs";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { describe } from "node:test";
import request from "supertest";
import app from "../app.js";
import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import {
  createProductController,
  deleteProductController,
  updateProductController,
} from "./productController.js";

jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: { Sandbox: null },
}));

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

jest.mock("../middlewares/authMiddleware.js", () => ({
  requireSignIn: jest.fn((req, res, next) => {
    if (req.headers.authorization) {
      req.user = { _id: req.headers.userId };
      return next();
    }
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }),
  isAdmin: jest.fn((req, res, next) => {
    if (req.headers.isadmin === "true") {
      return next();
    }
    return res
      .status(401)
      .json({ success: false, message: "Admin access required" });
  }),
}));

let mongoServer;
let savedCategory;

describe("Product Controller Integration Tests", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const category = new categoryModel({
      name: data.fields.category,
      slug: "testcategory",
    });
    await category.save();
    savedCategory = category;
  });

  afterAll(async () => {
    await categoryModel.deleteMany();

    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await productModel.deleteMany();
  });

  describe("(Create)", () => {
    it("model + controller should work correctly", async () => {
      const req = {
        ...data,
        fields: { ...data.fields, category: savedCategory._id },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      jest.spyOn(fs, "readFileSync").mockReturnValue("filedata");

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Created Successfully",
          products: expect.objectContaining({
            name: data.fields.name,
            description: data.fields.description,
            price: data.fields.price,
            category: savedCategory._id,
            quantity: data.fields.quantity,
            shipping: data.fields.shipping,
          }),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(
        await productModel.findOne({ name: data.fields.name }),
      ).not.toBeNull();
    });

    it("controller should send correct http requests on error missing field", async () => {
      const res = await request(app)
        .post("/api/v1/product/create-product")
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .field("name", "")
        .field("description", data.fields.description)
        .field("price", data.fields.price)
        .field("category", savedCategory._id.toString())
        .field("quantity", data.fields.quantity);

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({ message: "Name is Required" }),
      );
      expect(await productModel.find()).toHaveLength(0);
    });

    it("controller should send correct http requests on error not logged in", async () => {
      const res = await request(app)
        .post("/api/v1/product/create-product")
        .set("isadmin", "true");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Authentication required",
        }),
      );
      expect(await productModel.find()).toHaveLength(0);
    });

    it("controller should send correct http requests on error not admin", async () => {
      const res = await request(app)
        .post("/api/v1/product/create-product")
        .set("Authorization", "valid");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Admin access required",
        }),
      );
      expect(await productModel.find()).toHaveLength(0);
    });

    it("controller should send correct http requests on successful creation", async () => {
      const res = await request(app)
        .post("/api/v1/product/create-product")
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .field("name", data.fields.name)
        .field("description", data.fields.description)
        .field("price", data.fields.price)
        .field("category", savedCategory._id.toString())
        .field("quantity", data.fields.quantity)
        .field("shipping", data.fields.shipping);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: "Product Created Successfully",
          products: expect.objectContaining({
            ...data.fields,
            category: savedCategory._id.toString(),
          }),
        }),
      );
      expect(
        await productModel.findOne({ name: data.fields.name }),
      ).not.toBeNull();
    });
  });

  describe("(Update)", () => {
    it("model + controller should work correctly", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const req = {
        params: { pid: existingProduct._id.toString() },
        fields: {
          name: "UpdatedProduct",
          description: "UpdatedDescription",
          price: 99,
          category: savedCategory._id,
          quantity: 50,
          shipping: false,
        },
        files: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Updated Successfully",
          products: expect.objectContaining({
            name: req.fields.name,
            description: req.fields.description,
            price: req.fields.price,
            category: req.fields.category,
            quantity: req.fields.quantity,
            shipping: req.fields.shipping,
          }),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);

      const updatedInDb = await productModel.findById(existingProduct._id);
      expect(updatedInDb).not.toBeNull();
      expect(updatedInDb.name).toBe("UpdatedProduct");
    });

    it("controller should send correct http requests on error missing field", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const res = await request(app)
        .put(`/api/v1/product/update-product/${existingProduct._id}`)
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .field("name", "")
        .field("description", "UpdatedDescription")
        .field("price", "99")
        .field("category", savedCategory._id.toString())
        .field("quantity", "50");

      expect(res.status).toBe(400);
      expect(res.body).toEqual(
        expect.objectContaining({ message: "Name is Required" }),
      );

      const unchangedInDb = await productModel.findById(existingProduct._id);
      expect(unchangedInDb.description).toBe(data.fields.description);
    });

    it("controller should send correct http requests on error product not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .put(`/api/v1/product/update-product/${nonExistentId}`)
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .field("name", "UpdatedProduct")
        .field("description", "UpdatedDescription")
        .field("price", "99")
        .field("category", savedCategory._id.toString())
        .field("quantity", "50");

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Product not found",
        }),
      );
    });

    it("controller should send correct http requests on error not logged in", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const res = await request(app)
        .put(`/api/v1/product/update-product/${existingProduct._id}`)
        .set("isadmin", "true")
        .field("name", "UpdatedProduct")
        .field("description", "UpdatedDescription")
        .field("price", "99")
        .field("category", savedCategory._id.toString())
        .field("quantity", "50");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Authentication required",
        }),
      );
    });

    it("controller should send correct http requests on error not admin", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const res = await request(app)
        .put(`/api/v1/product/update-product/${existingProduct._id}`)
        .set("Authorization", "valid")
        .field("name", "UpdatedProduct")
        .field("description", "UpdatedDescription")
        .field("price", "99")
        .field("category", savedCategory._id.toString())
        .field("quantity", "50");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Admin access required",
        }),
      );
    });

    it("controller should send correct http requests on successful update", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const res = await request(app)
        .put(`/api/v1/product/update-product/${existingProduct._id}`)
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .field("name", "UpdatedProduct")
        .field("description", "UpdatedDescription")
        .field("price", "99")
        .field("category", savedCategory._id.toString())
        .field("quantity", "50")
        .field("shipping", "false");

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: "Product Updated Successfully",
          products: expect.objectContaining({
            name: "UpdatedProduct",
            description: "UpdatedDescription",
            price: 99,
            category: savedCategory._id.toString(),
            quantity: 50,
            shipping: false,
          }),
        }),
      );

      const updatedInDb = await productModel.findById(existingProduct._id);
      expect(updatedInDb).not.toBeNull();
      expect(updatedInDb.name).toBe("UpdatedProduct");
      expect(updatedInDb.description).toBe("UpdatedDescription");
      expect(updatedInDb.price).toBe(99);
      expect(updatedInDb.quantity).toBe(50);
    });
  });

  describe("(Delete)", () => {
    it("model + controller should work correctly", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const req = { params: { pid: existingProduct._id.toString() } };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

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
      expect(await productModel.findById(existingProduct._id)).toBeNull();
    });

    it("controller should send correct http requests on error product not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/v1/product/delete-product/${nonExistentId}`)
        .set("Authorization", "valid")
        .set("isadmin", "true");

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Product not found",
        }),
      );
    });

    it("controller should send correct http requests on error not logged in", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const res = await request(app)
        .delete(`/api/v1/product/delete-product/${existingProduct._id}`)
        .set("isadmin", "true");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Authentication required",
        }),
      );

      expect(await productModel.findById(existingProduct._id)).not.toBeNull();
    });

    it("controller should send correct http requests on error not admin", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const res = await request(app)
        .delete(`/api/v1/product/delete-product/${existingProduct._id}`)
        .set("Authorization", "valid");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Admin access required",
        }),
      );

      expect(await productModel.findById(existingProduct._id)).not.toBeNull();
    });

    it("controller should send correct http requests on successful deletion", async () => {
      const existingProduct = new productModel({
        ...data.fields,
        category: savedCategory._id,
        slug: "testproduct",
      });
      await existingProduct.save();

      const res = await request(app)
        .delete(`/api/v1/product/delete-product/${existingProduct._id}`)
        .set("Authorization", "valid")
        .set("isadmin", "true");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: "Product Deleted successfully",
        }),
      );

      expect(await productModel.find()).toHaveLength(0);
    });
  });
});
