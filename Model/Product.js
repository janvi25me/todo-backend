import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  qty: { type: String, required: true, default: 1 },
  category: { type: String },
  image: { type: String, required: true },
  SellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

productSchema.index({ name: 1 }, { unique: true });

export const Product = mongoose.model("Product", productSchema);
