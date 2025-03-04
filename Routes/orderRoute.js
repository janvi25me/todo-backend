import express from "express";
import {
  createOrder,
  fetchOrders,
  buyerOrders,
  sellerOrders,
  updateOrderDetails,
  verifyOtp,
  cancelOrder,
} from "../Controller/orderController.js";
import { Authenticated } from "../Middleware/Auth.js";

const router = express.Router();

router.get("/fetchOrders/:orderId", Authenticated, fetchOrders); //orderDetails/:id
router.get("/buyerOrders", Authenticated, buyerOrders);
router.get("/sellerOrders", Authenticated, sellerOrders);

router.post("/createOrder", Authenticated, createOrder);
router.post("/verifyOtp", Authenticated, verifyOtp);

router.patch("/update", Authenticated, updateOrderDetails);
router.patch("/cancelOrder/:orderId", Authenticated, cancelOrder);

export default router;
