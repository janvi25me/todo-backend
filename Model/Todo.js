import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  SellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

todoSchema.index({ name: 1 }, { unique: true });

export const Todo = mongoose.model("Todo", todoSchema);
