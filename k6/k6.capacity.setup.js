// Chia York Lim, A0258147X
import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { hashPassword } from "../helpers/authHelper.js";

dotenv.config({ override: false });

async function setup() {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    await userModel.deleteMany({});
    await orderModel.deleteMany({});

    const hashedPassword = await hashPassword("password123");

    const users = []

    for (let i = 1; i <= 200; i++) {
      users.push({
        name: `User${i}`,
        email: `User${i}@test.com`,
        password: hashedPassword,
        phone: `900000${String(i).padStart(2, "0")}`,
        address: `Address ${i}`,
        answer: `Answer ${i}`,
        role: 0,
      });
    }

    const products = await productModel.find({}).limit(3);

    const createdUsers = await userModel.insertMany(users);

    const orders = [];
    for (const user of createdUsers) {
      for (const product of products) {
        orders.push({
          products: [product._id],
          payment: {
            transactionId: `txn_${user._id}_${product._id}`
          },
          buyer: user._id,
          status: "Not Process",
        });
      }
    }
    await orderModel.insertMany(orders);
    process.exit(0);
  } catch (error) {
    console.error("Error setting up test data:", error);
    process.exit(1);
  }
}

setup();

// node k6/k6.capacity.setup.js