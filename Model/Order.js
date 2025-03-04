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
  address: {
    type: Object,
    required: true,
  },

  deliveryStatus: {
    type: String,
    // required: true,
    enum: ["PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED"],
    default: "PROCESSING",
  }, //no need

  products: [
    {
      _id: false,
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      SellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        // required: true,
      },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      qty: { type: Number, required: true, min: 1 },
      image: { type: String },
      productStatus: {
        type: String,
        required: true,
        enum: ["PENDING", "CANCELLED", "COMPLETED", "IN_TRANSIT"],
        default: "PENDING",
      },
      deliveryOtp: { type: String },
      // paymentStatus: {
      //   type: String,
      //   ref: "Payment",
      //   required: true,
      // },
    },
  ],

  noOfProducts: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  delivery: { type: Number, default: 0 },
  total: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Order = mongoose.model("Order", orderSchema);
