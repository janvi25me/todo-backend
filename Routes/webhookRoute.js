import { Payment } from "../Model/Payment.js";
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
// import { Order } from "../Model/Order.js";

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

          if (!orderId || !userId) {
            console.error("Missing orderId or userId in session metadata");
            return res.status(400).json({ error: "Invalid metadata" });
          }

          // Check if payment already exists
          const existingPayment = await Payment.findOne({ orderId });

          if (existingPayment) {
            console.log("Payment entry already exists, skipping creation.");
          } else {
            const payment = new Payment({
              orderId,
              userId,
              stripePaymentId: session.payment_intent,
              paymentStatus: "PENDING",
              orderDate: new Date(),
              amount: session.amount_total / 100,
            });

            await payment.save();
            console.log("Initial Payment entry created:", payment);
          }

          break;
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          const { orderId } = paymentIntent.metadata;

          if (!orderId) {
            console.error("Missing orderId in PaymentIntent metadata");
            return res.status(400).json({ error: "Invalid metadata" });
          }

          // Update payment status to SUCCESS
          const updatedPayment = await Payment.findOneAndUpdate(
            { orderId },
            { paymentStatus: "SUCCESS" },
            { new: true }
          );

          if (updatedPayment) {
            console.log("Payment Status Updated to SUCCESS:", updatedPayment);
          } else {
            console.warn(
              "No matching payment found to update for order:",
              orderId
            );
          }

          break;
        }

        case "payment_intent.payment_failed": {
          const failedIntent = event.data.object;
          const { orderId } = failedIntent.metadata;

          // Update Payment Status to FAILED
          await Payment.findOneAndUpdate(
            { orderId },
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
