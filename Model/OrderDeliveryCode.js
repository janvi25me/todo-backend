import mongoose from "mongoose";

const OrderDeliveryCodeSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
});

export const OrderDeliveryCode = mongoose.model(
  "OrderDeliveryCode",
  OrderDeliveryCodeSchema
);
