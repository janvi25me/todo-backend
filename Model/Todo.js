import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
  tag: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Todo = mongoose.model("Todo", todoSchema);
