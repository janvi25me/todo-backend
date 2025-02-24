import express from "express";
import {
  createOrder,
  fetchOrders,
  buyerOrders,
  sellerOrders,
} from "../Controller/orderController.js";
import { Authenticated } from "../Middleware/Auth.js";

const router = express.Router();

router.get("/fetchOrders/:orderId", Authenticated, fetchOrders); //orderDetails/:id
router.get("/buyerOrders", Authenticated, buyerOrders);
router.get("/sellerOrders", Authenticated, sellerOrders);

router.post("/createOrder", Authenticated, createOrder);

export default router;
