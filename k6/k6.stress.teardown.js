// Name: Tan Qin Yong
// Student No: A0253468W

import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../models/userModel.js";

// Make sure this points to your backend's .env file path if it's not in the root
dotenv.config({ override: false });

async function reset() {
  try {
    // Connect to your local MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    
    // Wipe all users created during the stress test
    await userModel.deleteMany({});
    
    console.log("Teardown complete: All users have been wiped from the database.");
    process.exit(0);
  } catch (err) {
    console.error("Teardown failed:", err);
    process.exit(1);
  }
}

reset();