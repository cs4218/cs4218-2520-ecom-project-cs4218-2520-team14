// Jonas Ong, A0252052U

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { describe } from "node:test";
import request from "supertest";
import app from "../app.js";
import categoryModel from "../models/categoryModel.js";
import {
  createCategoryController,
  deleteCategoryController,
  updateCategoryController,
} from "./categoryController.js";

jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: { Sandbox: null },
}));

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

describe("Category Controller Integration Tests", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await categoryModel.syncIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await categoryModel.deleteMany();
  });

  describe("(Create)", () => {
    it("model + controller should work correctly", async () => {
      const req = { body: { name: "TestCategory" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "New category created",
          category: expect.objectContaining({
            name: "TestCategory",
            slug: "testcategory",
          }),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(
        await categoryModel.findOne({ name: "TestCategory" }),
      ).not.toBeNull();
    });

    it("controller should send correct http requests on error missing name", async () => {
      const res = await request(app)
        .post("/api/v1/category/create-category")
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .send({ name: "" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Name is required",
        }),
      );
      expect(await categoryModel.find()).toHaveLength(0);
    });

    it("controller should send correct http requests on error duplicate category", async () => {
      await categoryModel.create({
        name: "ExistingCategory",
        slug: "existingcategory",
      });

      const res = await request(app)
        .post("/api/v1/category/create-category")
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .send({ name: "ExistingCategory" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Category Already Exists",
        }),
      );
      expect(
        await categoryModel.find({ name: "ExistingCategory" }),
      ).toHaveLength(1);
    });

    it("controller should send correct http requests on error not logged in", async () => {
      const res = await request(app)
        .post("/api/v1/category/create-category")
        .set("isadmin", "true")
        .send({ name: "TestCategory" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Authentication required",
        }),
      );
      expect(await categoryModel.find()).toHaveLength(0);
    });

    it("controller should send correct http requests on error not admin", async () => {
      const res = await request(app)
        .post("/api/v1/category/create-category")
        .set("Authorization", "valid")
        .send({ name: "TestCategory" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Admin access required",
        }),
      );
      expect(await categoryModel.find()).toHaveLength(0);
    });

    it("controller should send correct http requests on successful creation", async () => {
      const res = await request(app)
        .post("/api/v1/category/create-category")
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .send({ name: "TestCategory" });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: "New category created",
          category: expect.objectContaining({
            name: "TestCategory",
            slug: "testcategory",
          }),
        }),
      );
      expect(
        await categoryModel.findOne({ name: "TestCategory" }),
      ).not.toBeNull();
    });
  });

  describe("(Update)", () => {
    it("model + controller should work correctly", async () => {
      const existingCategory = await categoryModel.create({
        name: "OldCategory",
        slug: "oldcategory",
      });

      const req = {
        body: { name: "UpdatedCategory" },
        params: { id: existingCategory._id.toString() },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Category Updated Successfully",
          category: expect.objectContaining({
            name: "UpdatedCategory",
            slug: "updatedcategory",
          }),
        }),
      );
      expect(res.send).toHaveBeenCalledTimes(1);

      const updatedInDb = await categoryModel.findById(existingCategory._id);
      expect(updatedInDb).not.toBeNull();
      expect(updatedInDb.name).toBe("UpdatedCategory");
      expect(updatedInDb.slug).toBe("updatedcategory");
    });

    it("controller should send correct http requests on error category not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .put(`/api/v1/category/update-category/${nonExistentId}`)
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .send({ name: "UpdatedCategory" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Category not found",
        }),
      );
    });

    it("controller should send correct http requests on error missing name", async () => {
      const existingCategory = await categoryModel.create({
        name: "OriginalCategory",
        slug: "originalcategory",
      });

      const res = await request(app)
        .put(`/api/v1/category/update-category/${existingCategory._id}`)
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .send({ name: "" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Name is required",
        }),
      );

      const unchangedInDb = await categoryModel.findById(existingCategory._id);
      expect(unchangedInDb).not.toBeNull();
      expect(unchangedInDb.name).toBe("OriginalCategory");
      expect(unchangedInDb.slug).toBe("originalcategory");
    });

    it("controller should send correct http requests on error not logged in", async () => {
      const existingCategory = await categoryModel.create({
        name: "OldCategory",
        slug: "oldcategory",
      });

      const res = await request(app)
        .put(`/api/v1/category/update-category/${existingCategory._id}`)
        .set("isadmin", "true")
        .send({ name: "UpdatedCategory" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Authentication required",
        }),
      );

      const unchangedInDb = await categoryModel.findById(existingCategory._id);
      expect(unchangedInDb).not.toBeNull();
      expect(unchangedInDb.name).toBe("OldCategory");
      expect(unchangedInDb.slug).toBe("oldcategory");
    });

    it("controller should send correct http requests on error not admin", async () => {
      const existingCategory = await categoryModel.create({
        name: "OldCategory",
        slug: "oldcategory",
      });

      const res = await request(app)
        .put(`/api/v1/category/update-category/${existingCategory._id}`)
        .set("Authorization", "valid")
        .send({ name: "UpdatedCategory" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Admin access required",
        }),
      );

      const unchangedInDb = await categoryModel.findById(existingCategory._id);
      expect(unchangedInDb).not.toBeNull();
      expect(unchangedInDb.name).toBe("OldCategory");
      expect(unchangedInDb.slug).toBe("oldcategory");
    });

    it("controller should send correct http requests on successful update", async () => {
      const existingCategory = await categoryModel.create({
        name: "OldCategory",
        slug: "oldcategory",
      });

      const res = await request(app)
        .put(`/api/v1/category/update-category/${existingCategory._id}`)
        .set("Authorization", "valid")
        .set("isadmin", "true")
        .send({ name: "UpdatedCategory" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: "Category Updated Successfully",
          category: expect.objectContaining({
            name: "UpdatedCategory",
            slug: "updatedcategory",
          }),
        }),
      );

      const updatedInDb = await categoryModel.findById(existingCategory._id);
      expect(updatedInDb).not.toBeNull();
      expect(updatedInDb.name).toBe("UpdatedCategory");
      expect(updatedInDb.slug).toBe("updatedcategory");
    });
  });

  describe("(Delete)", () => {
    it("model + controller should work correctly", async () => {
      const existingCategory = await categoryModel.create({
        name: "DeleteCategory",
        slug: "deletecategory",
      });

      const req = { params: { id: existingCategory._id.toString() } };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

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
      expect(await categoryModel.find()).toHaveLength(0);
    });

    it("controller should send correct http requests on error category not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/v1/category/delete-category/${nonExistentId}`)
        .set("Authorization", "valid")
        .set("isadmin", "true");

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Category not found",
        }),
      );
    });

    it("category should no longer exist in database after deletion", async () => {
      const existingCategory = await categoryModel.create({
        name: "TransientCategory",
        slug: "transientcategory",
      });

      const deleteRes = await request(app)
        .delete(`/api/v1/category/delete-category/${existingCategory._id}`)
        .set("Authorization", "valid")
        .set("isadmin", "true");

      expect(deleteRes.status).toBe(200);

      const deletedInDb = await categoryModel.findById(existingCategory._id);
      expect(deletedInDb).toBeNull();
    });

    it("controller should send correct http requests on error not logged in", async () => {
      const existingCategory = await categoryModel.create({
        name: "DeleteCategory",
        slug: "deletecategory",
      });

      const res = await request(app)
        .delete(`/api/v1/category/delete-category/${existingCategory._id}`)
        .set("isadmin", "true");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Authentication required",
        }),
      );

      const existingInDb = await categoryModel.findById(existingCategory._id);
      expect(existingInDb).not.toBeNull();
      expect(existingInDb.name).toBe("DeleteCategory");
      expect(existingInDb.slug).toBe("deletecategory");
    });

    it("controller should send correct http requests on error not admin", async () => {
      const existingCategory = await categoryModel.create({
        name: "DeleteCategory",
        slug: "deletecategory",
      });

      const res = await request(app)
        .delete(`/api/v1/category/delete-category/${existingCategory._id}`)
        .set("Authorization", "valid");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Admin access required",
        }),
      );

      const existingInDb = await categoryModel.findById(existingCategory._id);
      expect(existingInDb).not.toBeNull();
      expect(existingInDb.name).toBe("DeleteCategory");
      expect(existingInDb.slug).toBe("deletecategory");
    });

    it("controller should send correct http requests on successful deletion", async () => {
      const existingCategory = await categoryModel.create({
        name: "DeleteCategory",
        slug: "deletecategory",
      });

      const res = await request(app)
        .delete(`/api/v1/category/delete-category/${existingCategory._id}`)
        .set("Authorization", "valid")
        .set("isadmin", "true");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: "Category Deleted Successfully",
        }),
      );

      const deletedInDb = await categoryModel.findById(existingCategory._id);
      expect(deletedInDb).toBeNull();
    });
  });
});
