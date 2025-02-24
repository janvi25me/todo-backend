import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  orderStatus: {
    type: String,
    required: true,
    enum: ["PENDING", "CANCELLED", "COMPLETED", "IN_TRANSIT"],
    default: "PENDING",
  },
  buyerInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sellerInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  address: {
    type: Object,
    required: true,
  },
  deliveryStatus: {
    type: String,
    required: true,
    enum: ["PROCESSING", "READY_TO_SHIP", "OUT_FOR_DELIVERY", "DELIVERED"],
    default: "PROCESSING",
  },

  products: [
    {
      _id: false,
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      qty: { type: Number, required: true, min: 1 },
      image: { type: String },
    },
  ],
  noOfProducts: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  delivery: { type: Number, default: 0 },
  total: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Order = mongoose.model("Order", orderSchema);
