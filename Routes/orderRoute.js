import express from "express";
import { createOrder, buyerOrders } from "../Controller/order.js";
import { Authenticated } from "../Middleware/Auth.js";

const router = express.Router();

router.post("/createOrder", Authenticated, createOrder);

router.get("/buyerOrders", Authenticated, buyerOrders);

export default router;
