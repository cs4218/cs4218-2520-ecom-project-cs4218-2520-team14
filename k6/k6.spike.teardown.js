// Teng Hui Xin Alicia, A0259064Y

import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

dotenv.config({ path: ".env.spike" });

async function reset() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await userModel.deleteMany({});
    await orderModel.deleteMany({});

    console.log("Teardown complete: All users have been wiped from the database.");
    process.exit(0);
  } catch (err) {
    console.error("Teardown failed:", err);
    process.exit(1);
  }
}

reset();
