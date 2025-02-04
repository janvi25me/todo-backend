import mongoose from "mongoose";
import { z } from "zod";

export const validateUserData = z.object({
  email: z.string().email().min(1, { message: "Email is required" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["1", "2"], {
    message: "Role must be either 1 (buyer) or 2 (seller)",
  }),
  firstName: z.string().min(1, { message: "First name is required" }),
  middleName: z.string().min(1, { message: "Middle name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  shopName: z.string().optional(),
  contact: z
    .string()
    .regex(/^\d{10}$/, { message: "Contact must be a 10-digit number" })
    .optional(),
  // image: z.object({
  //   // size: z.number().max(MAX_FILE_SIZE, { message: "Max image size is 5MB." }),
  //   mimetype: z.string().refine((type) => ACCEPTED_IMAGE_TYPES.includes(type), {
  //     message: "Only .jpg, .jpeg, .png, and .webp formats are supported.",
  //   }),
  // }),
});

let roles = ["1", "2"]; // 1 - Buyer, 2 - Seller

const userProfileSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, trim: true },
  image: { type: String, default: "" },
  role: { type: String, required: true, enum: roles, default: "1" },
  contact: { type: String, trim: true },
  shopName: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

userProfileSchema.pre("save", function (next) {
  if (this.role === "2" && !this.shopName) {
    return next(new Error("Shop name is required for sellers"));
  }
  next();
});

export const User =
  mongoose.models.User || mongoose.model("User", userProfileSchema);
