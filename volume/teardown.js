import mongoose from "mongoose";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";

(async () => {
  try {
    const { MONGO_URI } = process.env;

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await userModel.deleteMany({});
    await categoryModel.deleteMany({});
    await productModel.deleteMany({});
    await orderModel.deleteMany({});

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error deleting admin account:", error);
    process.exit(1);
  }
})();
