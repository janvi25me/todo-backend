import { Payment } from "../Model/Payment.js";
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Order } from "../Model/Order.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Stripe secret key
const router = express.Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("Webhook Event Received:", event.type);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const { orderId, userId } = session.metadata;
          console.log("Order ID", orderId);
          if (!orderId || !userId) {
            console.error("Missing orderId or userId in session metadata");
            return res.status(400).json({ error: "Invalid metadata" });
          }

          // Update Payment Status
          const updatedPayment = await Payment.findOneAndUpdate(
            { stripePaymentId: session.id },
            { paymentStatus: "SUCCESS" },
            { new: true }
          );

          if (!updatedPayment) {
            console.error(
              "Payment record not found for Stripe ID:",
              session.id
            );
            return res.status(404).json({ error: "Payment record not found" });
          }

          //in here all data for order & userInfo is available
          console.log("Payment Status Updated Successfully:", updatedPayment);

          // Update Order Status to PAID

          const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { paymentStatus: "SUCCESS" }, // Only update paymentStatus
            { new: true }
          );

          if (!updatedOrder) {
            console.error("Order not found for ID:", orderId);
            return res.status(404).json({ error: "Order not found" });
          }

          console.log("Order Status Updated to PAID:", updatedOrder);
          break;
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          const { orderId, userId } = paymentIntent.metadata;

          if (!orderId || !userId) {
            console.error("Missing metadata in PaymentIntent");
            return res.status(400).json({ error: "Invalid metadata" });
          }

          const payment = new Payment({
            orderId,
            userId,
            stripePaymentId: paymentIntent.id,
            paymentStatus: "SUCCESS",
            orderDate: new Date(),
            amount: paymentIntent.amount / 100,
          });

          await payment.save();
          console.log("Payment successfully saved:", payment);
          break;
        }

        case "payment_intent.payment_failed": {
          console.warn(
            "Payment failed for PaymentIntent:",
            event.data.object.id
          );

          const failedIntent = event.data.object;
          const { orderId } = failedIntent.metadata;

          // Update Payment Status to FAILED
          await Payment.findOneAndUpdate(
            { stripePaymentId: failedIntent.id },
            { paymentStatus: "FAILED" }
          );

          console.warn("Payment status set to FAILED for order:", orderId);
          break;
        }

        default:
          console.warn(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Error processing webhook event:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
