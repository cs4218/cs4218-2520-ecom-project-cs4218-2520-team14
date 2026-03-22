import { spawn } from "child_process";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { hashPassword } from "../helpers/authHelper.js";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";

export default async function setup() {
  // 1. Start memory DB
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  process.env.MONGO_URL = uri;
  process.env.PORT = "6060";
  process.env.DEV_MODE = "test";
  process.env.REACT_APP_MODE = "test";
  process.env.JWT_SECRET = "playwright-test-secret";

  (global as any).__MONGOD__ = mongod;

  await mongoose.connect(uri);

  const [electronics, books, clothing] = await Category.create([
    { name: "Electronics", slug: "electronics" },
    { name: "Books", slug: "books" },
    { name: "Clothing", slug: "clothing" },
  ]);

  await Product.create([
    {
      name: "iPhone 13",
      slug: "iphone-13",
      description: "Latest Apple iPhone with A15 Bionic chip",
      price: 20,
      category: electronics._id,
      quantity: 20,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    },
    {
      name: "The Great Gatsby",
      slug: "the-great-gatsby",
      description: "Classic novel by F. Scott Fitzgerald",
      price: 10,
      category: books._id,
      quantity: 100,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    },
    {
      name: "Laptop",
      slug: "laptop",
      description: "High performance laptop for work and gaming",
      price: 30,
      category: electronics._id,
      quantity: 30,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    },
    {
      name: "Test Clothing 1",
      slug: "test-clothing-1",
      description: "Comfortable cotton t-shirt",
      price: 30,
      category: clothing._id,
      quantity: 50,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    },
    {
      name: "Test Clothing 2",
      slug: "test-clothing-2",
      description: "Stylish denim jeans",
      price: 200,
      category: clothing._id,
      quantity: 30,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    },
    {
      name: "Test Clothing 3",
      slug: "test-clothing-3",
      description: "Casual cotton pants",
      price: 200,
      category: clothing._id,
      quantity: 40,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    },
    {
      name: "Test Clothing 4",
      slug: "test-clothing-4",
      description: "Formal dress shirt",
      price: 200,
      category: clothing._id,
      quantity: 25,
      shipping: true,
      photo: {
        data: Buffer.from(""),
        contentType: "image/jpeg",
      },
    },
  ]);

  const userPassword = await hashPassword("password123");
  const adminPassword = await hashPassword("admin123");

  await User.create([
    {
      _id: "69bbffabbb744c5c6268221e",
      name: "Mina Sue",
      email: "mina.sue@netflix.com",
      password: userPassword,
      phone: "123456789",
      address: "Singles Inferno",
      answer: "blue",
      role: 0,
    },
    {
      _id: "69bbffabbb744c5c62682220",
      name: "Min Gee",
      email: "min.gee@netflix.com",
      password: userPassword,
      phone: "123456789",
      address: "",
      answer: "green",
      role: 0,
    },
    {
      _id: "69bbffabbb744c5c62682221",
      name: "John Doe",
      email: "john@doe.com",
      password: userPassword,
      phone: "999",
      address: "123 Avenue",
      answer: "yellow",
      role: 0,
    },
  ]);

  await User.create({
    _id: "69bbffabbb744c5c6268221f",
    name: "Admin User",
    email: "admin@test.com",
    password: adminPassword,
    phone: "99999999",
    address: "SG",
    answer: "red",
    role: 1,
  });

  await mongoose.disconnect();

  const server = spawn("node", ["server.js"], {
    env: { ...process.env },
    stdio: "pipe",
  });

  (global as any).__SERVER__ = server;

  server.stdout?.on("data", (data: Buffer) =>
    console.log("[server]", data.toString()),
  );
  server.stderr?.on("data", (data: Buffer) =>
    console.error("[server]", data.toString()),
  );

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Backend server failed to start within 15s")),
      15_000,
    );

    server.stdout?.on("data", (data: Buffer) => {
      if (data.toString().includes("6060")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited unexpectedly with code ${code}`));
    });
  });
}
