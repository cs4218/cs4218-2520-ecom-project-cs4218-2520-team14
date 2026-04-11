// Chia York Lim, A0258147X
import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

dotenv.config({ path: ".env.capacity" });

async function reset() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await userModel.deleteMany({});
    await orderModel.deleteMany({});

    console.log("Capacity test DB reset successfully");
    process.exit(0);
  } catch (err) {
    console.error("Reset failed:", err);
    process.exit(1);
  }
}

reset();

// node k6/k6.capacity.teardown.js