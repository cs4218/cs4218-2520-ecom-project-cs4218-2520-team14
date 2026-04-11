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

// Name: Shauryan Agrawal
// Student ID: A0265846N

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);