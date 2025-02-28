import { Payment } from "../Model/Payment.js";
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Order } from "../Model/Order.js";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

export const checkout = async (req, res) => {
  const { products } = req.body;

  if (
    !products ||
    !Array.isArray(products.products) ||
    products.products.length === 0
  ) {
    return res.status(400).json({ error: "Invalid products data format" });
  }

  let orderId = products?._id;
  const userId = products.buyerInfo?._id;
  const productList = products.products;

  try {
    if (!orderId) {
      const newOrder = new Order({
        buyerInfo: userId,
        products: productList.map((product) => ({
          name: product.name,
          price: product.price,
          qty: product.qty,
          image: product.image || "",
        })),
        noOfProducts: productList.length,
        subtotal: products.subtotal,
        delivery: products.delivery,
        total: products.total,
        orderStatus: "PENDING",
        address: products.address,
      });

      const savedOrder = await newOrder.save();
      orderId = savedOrder._id.toString();
      console.log("Order Created Successfully:", savedOrder);
    }

    const metadata = {
      userId: userId,
      orderId: orderId,
      totalAmount: products.total.toString(),
      userShipping: JSON.stringify({ address: products.address.myAddress }),
      cartItems: JSON.stringify(productList),
    };

    const customer = await stripe.customers.create({ metadata });
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2025-01-27.acacia" }
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: productList.map((product) => ({
        price_data: {
          currency: "INR",
          product_data: { name: product.name },
          unit_amount: product.price * 100,
        },
        quantity: product.qty,
      })),
      mode: "payment",
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/cancel",
      metadata: metadata,
      payment_intent_data: {
        metadata: metadata,
      },
    });

    // Save Payment with PENDING status
    const newPayment = new Payment({
      userId: userId,
      orderId: orderId,
      paymentStatus: "PENDING",
      stripePaymentId: session.id,
      stripeCustomerId: customer.id,
    });

    await newPayment.save();

    res.json({
      id: session.id,
      paymentIntent: session.payment_intent,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
    });
  } catch (error) {
    console.error("Error in checkout process:", error);
    res.status(500).json({ error: "Failed to process checkout" });
  }
};

export default router;
