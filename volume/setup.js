import mongoose from "mongoose";
import { hashPassword } from "../helpers/authHelper.js";
import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";

(async () => {
  try {
    const {
      MONGO_URI,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      CATEGORY_NAME,
      PRODUCT_NAME,
    } = process.env;
    const seedProductName = PRODUCT_NAME || "Volume Seed Product";

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    if (await userModel.findOne({ email: ADMIN_EMAIL })) {
      console.log(
        `Admin account already exists: ${ADMIN_EMAIL} — skipping creation.`,
      );
    } else {
      console.log(`Admin account not found: ${ADMIN_EMAIL} — creating it.`);
      await userModel.deleteMany({});

      await userModel.insertOne({
        name: "Test User",
        email: ADMIN_EMAIL,
        password: await hashPassword(ADMIN_PASSWORD),
        phone: `90000000`,
        address: `Address`,
        answer: `Answer`,
        role: 1,
      });

      console.log(`Admin account created: ${ADMIN_EMAIL}`);
    }

    if (await categoryModel.findOne({ name: CATEGORY_NAME })) {
      console.log(
        `Category already exists: ${CATEGORY_NAME} — skipping creation.`,
      );
    } else {
      console.log(`Category not found: ${CATEGORY_NAME} — creating it.`);
      await categoryModel.insertOne({
        name: CATEGORY_NAME,
        slug: CATEGORY_NAME.toLowerCase().replace(/\s+/g, "-"),
      });

      console.log(`Category created: ${CATEGORY_NAME}`);
    }

    const category = await categoryModel.findOne({ name: CATEGORY_NAME });

    if (!category) {
      throw new Error(`Seed category not found: ${CATEGORY_NAME}`);
    }

    const seedProductSlug = seedProductName.toLowerCase().replace(/\s+/g, "-");
    if (await productModel.findOne({ slug: seedProductSlug })) {
      console.log(
        `Seed product already exists: ${seedProductName} — skipping creation.`,
      );
    } else {
      await productModel.insertOne({
        name: seedProductName,
        slug: seedProductSlug,
        description: "Seed product for volume test setup",
        price: 9.99,
        category: category._id,
        quantity: 100,
        shipping: true,
      });
      console.log(`Seed product created: ${seedProductName}`);
    }

    console.log("Setup complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during setup:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
