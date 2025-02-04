import mongoose from "mongoose";

// const cartItemsSchema = new mongoose.Schema({
//   productId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Cart",
//     require: true,
//   },
//   name: { type: String, require: true },
//   description: { type: String, require: true },
//   price: { type: Number, require: true },
//   qty: { type: Number, require: true },
// });

const addressSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // items: [cartItemsSchema],
  myAddress: {
    type: String,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Address = mongoose.model("Address", addressSchema);
