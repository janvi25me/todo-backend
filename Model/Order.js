import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  orderStatus: {
    type: String,
    required: true,
    enum: ["PENDING", "CONFIRM", "CANCEL", "COMPLETED", "IN_TRANSIT"],
    default: "PENDING",
  },
  buyerInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  //   sellerInfo: {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "User",
  //     required: true,
  //   },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      qty: { type: Number, required: true, min: 1 },
      image: { type: String },
      // totalPrice: { type: Number, required: true },
    },
  ],
  noOfProducts: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  delivery: { type: Number, default: 0 },
  total: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Order = mongoose.model("Order", orderSchema);
