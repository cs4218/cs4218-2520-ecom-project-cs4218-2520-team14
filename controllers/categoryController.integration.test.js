// Name: Chia York Lim
// Student ID: A0258147X

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import request from "supertest";
import categoryModel from "../models/categoryModel";

jest.mock("../config/db.js", () => jest.fn());

describe("Category Controller Integration Test", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await categoryModel.create([
      { name: "Category1", slug: "category1" },
      { name: "Category2", slug: "category2" },
      { name: "Category3", slug: "category3" },
    ]);
  });

  afterEach(async () => {
    await categoryModel.deleteMany({});
  });

  it("should be able to return all categories", async () => {
    const res = await request(app).get("/api/v1/category/get-category");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("message", "All Categories List");
    expect(res.body).toHaveProperty("category");
    expect(res.body.category).toHaveLength(3);

    res.body.category.forEach((cat) => {
      expect(cat).toHaveProperty("_id");
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("slug");
    });
  });

  it("should be able to return all categories (Empty)", async () => {
    await categoryModel.deleteMany({});
    const res = await request(app).get("/api/v1/category/get-category");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("message", "All Categories List");
    expect(res.body).toHaveProperty("category");
    expect(res.body.category).toHaveLength(0);
  });

  it("should handle errors and return 500 status (Get All Categories)", async () => {
    const mockError = new Error("Database error");
    jest.spyOn(categoryModel, "find").mockRejectedValueOnce(mockError);
    const res = await request(app).get("/api/v1/category/get-category");
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message", "Error while getting all categories");
    expect(res.body).toHaveProperty("error");
  });

  it("should be able to return single category by slug", async () => {
    const res = await request(app).get("/api/v1/category/single-category/category1");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("message", "Get Single Category Successfully");
    expect(res.body).toHaveProperty("category");
    expect(res.body.category).toHaveProperty("_id");
    expect(res.body.category).toHaveProperty("name", "Category1");
    expect(res.body.category).toHaveProperty("slug", "category1");
  });

  it("should return 404 for non-existent category slug", async () => {
    const res = await request(app).get("/api/v1/category/single-category/nonexistent");
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message", "Category not found");
  });

  it("should handle errors and return 500 status (Get Single Category)", async () => {
    const mockError = new Error("Database error");
    jest.spyOn(categoryModel, "findOne").mockRejectedValueOnce(mockError);
    const res = await request(app).get("/api/v1/category/single-category/category1");
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message", "Error while getting single category");
    expect(res.body).toHaveProperty("error");
  });
});