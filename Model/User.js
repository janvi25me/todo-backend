import mongoose from "mongoose";
import { z } from "zod";

let roles = ["1", "2", "3"];
//1 : Buyer
//2: Seller
//3: Admin

export const userValidationSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").optional(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z
    .enum(roles, { errorMap: () => ({ message: "Valid role required" }) })
    .optional(),
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: roles,
    default: "1",
  },
  createdAt: { type: Date, default: Date.now },
});
export const User = mongoose.model("User", userSchema);
