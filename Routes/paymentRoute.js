import express from "express";
import { checkout } from "../Controller/paymentController.js";

const router = express.Router();

router.post("/stripe", checkout);
// router.post("/verify-payment", verify);

// router.post("/webhook", express.raw({ type: "application/json" }), webhook);

export default router;
