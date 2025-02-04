import { Order } from "../Model/Order.js";
import { Cart } from "../Model/Cart.js";
import { User } from "../Model/User.js";
import { Address } from "../Model/Address.js";
import { Product } from "../Model/Product.js";
import moment from "moment";
import mongoose from "mongoose";

const calculateCartTotals = (cartItems) => {
  const delivery = 0;
  const subTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const total = subTotal + delivery;
  const noOfProducts = cartItems.length;

  return { subTotal, total, delivery, noOfProducts };
};

export const createOrder = async (req, res) => {
  const buyerId = req?.user?.id;
  const role = req?.user?.role;
  //   console.log("?", buyerId);
  try {
    if (role === "2") {
      return res.status(503).json({
        message: "Only buyers can order the product",
        success: false,
      });
    }

    const cart = await Cart.findOne({ buyerId });
    if (!cart) {
      return res.status(404).json({
        message: "No cart found for this buyer.",
        success: false,
      });
    }
    // console.log("))", cart);

    const buyerInfo = await User.findById(buyerId);
    if (!buyerInfo) {
      return res.status(404).json({
        message: "Buyer information not found.",
        success: false,
      });
    }
    // console.log("%%", buyerInfo);

    const myAddress = await Address.findOne({
      buyerId,
      isDefault: true,
    }).select("myAddress");

    if (!myAddress) {
      return res.status(404).json({
        message: "Default address not found.",
        success: false,
      });
    }

    const orderProducts = cart.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      qty: item.qty,
      image: item.image,
      totalPrice: item.price * item.qty,
    }));

    const { subTotal, total, delivery, noOfProducts } = calculateCartTotals(
      cart.items
    );

    const order = new Order({
      orderStatus: "PENDING",
      buyerInfo: buyerInfo,
      //   sellerInfo: buyerInfo._id,
      address: myAddress,
      products: orderProducts,
      subtotal: subTotal,
      total,
      delivery,
      noOfProducts: noOfProducts,
    });

    // console.log("Order Details", order);

    await order.save();

    res.status(200).json({
      message: "Order created successfully.",
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    return res.status(500).json({
      message: "An error occurred while creating the order.",
      success: false,
    });
  }
};

export const buyerOrders = async (req, res) => {
  try {
    const { from, to, orderStatus, seek_id } = req.query;
    const { role, id } = req.user;

    if (role !== "1") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only buyers can view orders.",
      });
    }

    const filters = { buyerInfo: id };

    // seek_id filter logic
    if (seek_id && seek_id !== "null" && seek_id !== "undefined") {
      if (!mongoose.Types.ObjectId.isValid(seek_id)) {
        return res.status(400).json({ message: "Invalid seek_id format." });
      }
      filters._id = { $lt: new mongoose.Types.ObjectId(seek_id) };
    }

    const now = moment.utc().toDate();
    let fromDate, toDate;

    if (from && to) {
      if (
        !moment(from, "DD-MM-YYYY", true).isValid() ||
        !moment(to, "DD-MM-YYYY", true).isValid()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use DD-MM-YYYY.",
        });
      }

      fromDate = moment.utc(from, "DD-MM-YYYY").startOf("day").toDate();
      toDate = moment.utc(to, "DD-MM-YYYY").endOf("day").toDate();

      if (toDate > now) {
        toDate = now;
      }

      if (fromDate > toDate) {
        [fromDate, toDate] = [toDate, fromDate]; // Swap if out of order
      }

      filters.createdAt = { $gte: fromDate, $lte: toDate };
    } else {
      filters.createdAt = { $lte: now };
    }

    const allowedStatuses = [
      "PENDING",
      "CONFIRM",
      "CANCEL",
      "COMPLETED",
      "IN_TRANSIT",
    ];
    if (orderStatus && allowedStatuses.includes(orderStatus.toUpperCase())) {
      filters.orderStatus = orderStatus.toUpperCase();
    }

    const orders = await Order.find(filters);

    if (!orders.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        orders: [],
        message: "No orders found for the given filters.",
      });
    }

    // Enrich orders
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const buyerInfo = await User.findById(order.buyerInfo).select(
          "firstName lastName email contact"
        );
        const address = await Address.findById(order.address).select(
          "myAddress"
        );

        const products = await Promise.all(
          order.products.map(async (item) => {
            const product = await Product.findById(item.productId).select(
              "description SellerId"
            );
            return product
              ? {
                  ...item.toObject(),
                  description: product.description,
                  SellerId: product.SellerId,
                }
              : item;
          })
        );

        return { ...order.toObject(), buyerInfo, address, products };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedOrders.length,
      orders: enrichedOrders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};
