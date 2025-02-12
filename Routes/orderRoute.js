import express from "express";
import { createOrder, fetchOrders, buyerOrders } from "../Controller/order.js";
import { Authenticated } from "../Middleware/Auth.js";

const router = express.Router();

router.get("/fetchOrders/:orderId", Authenticated, fetchOrders);

router.post("/createOrder", Authenticated, createOrder);

router.get("/buyerOrders", Authenticated, buyerOrders);

export default router;
