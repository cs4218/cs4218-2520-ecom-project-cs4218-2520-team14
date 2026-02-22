import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    unique: true,
  },
  slug: {
    type: String,
    required: [true, "Slug is required"],
    lowercase: true,
  },
});

export default mongoose.model("Category", categorySchema);