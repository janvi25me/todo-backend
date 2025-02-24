import { Order } from "../Model/Order.js";
import { Cart } from "../Model/Cart.js";
import { User } from "../Model/User.js";
import { Address } from "../Model/Address.js";
import { Product } from "../Model/Product.js";
import { Payment } from "../Model/Payment.js";
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

    const buyerInfo = await User.findById(buyerId).select(
      "firstName middleName lastName email role contact"
    );
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
    }).select("_id myAddress");

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

    // update cart with empty items after creating an order
    await Cart.updateOne({ buyerId }, { $set: { items: [] } });

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

export const fetchOrders = async (req, res) => {
  const buyerId = req?.user?.id;
  const role = req?.user?.role;
  const orderId = req.params.orderId;

  try {
    if (role === "2") {
      return res.status(403).json({
        message: "Only buyers can view orders.",
        success: false,
      });
    }

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required.",
        success: false,
      });
    }

    // Fetch order details
    const order = await Order.findOne({ _id: orderId }).select(
      "orderStatus deliveryStatus subtotal delivery total createdAt products noOfProducts buyerInfo address"
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
        success: false,
      });
    }

    // Fetch payment details for the order
    const payment = await Payment.findOne({ orderId }).select("paymentStatus");

    // Fetch buyer info
    const buyerInfo = order.buyerInfo
      ? await User.findById(order.buyerInfo).select(
          "firstName middleName lastName email contact"
        )
      : null;

    // Fetch address details
    const address = order.address
      ? await Address.findById(order.address).select("myAddress")
      : null;

    // Fetch product details for each product in the order
    const orderWithProducts = await Promise.all(
      order.products.map(async (productItem) => {
        const product = await Product.findById(productItem.productId).select(
          "name price image qty description"
        );

        return {
          ...product.toObject(),
          qty: productItem.qty,
          totalPrice: productItem.totalPrice,
        };
      })
    );

    // Merge the order data with related data
    const orderDetails = {
      ...order.toObject(),
      buyerInfo,
      address,
      products: orderWithProducts,
      paymentStatus: payment ? payment.paymentStatus : "PENDING",
    };

    res.status(200).json({
      message: "Order fetched successfully.",
      success: true,
      data: orderDetails,
    });
  } catch (error) {
    console.error("Error in fetchOrders:", error);
    return res.status(500).json({
      message: "An error occurred while fetching the order.",
      success: false,
    });
  }
};

export const buyerOrders = async (req, res) => {
  try {
    const {
      from,
      to,
      includesOrderStatuses,
      excludesOrderStatuses,
      page = 1,
      limit = 10,
    } = req.query;
    const { role, id } = req.user;

    if (role !== "1") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only buyers can view orders.",
      });
    }

    const filters = { buyerInfo: id };
    const today = moment.utc().startOf("day").toDate();
    let fromDate, toDate;

    let includeStatusesArray = [];
    if (includesOrderStatuses) {
      includeStatusesArray = Array.isArray(includesOrderStatuses)
        ? includesOrderStatuses
        : includesOrderStatuses.split(",");
    }

    let excludeStatusesArray = [];
    if (excludesOrderStatuses) {
      excludeStatusesArray = Array.isArray(excludesOrderStatuses)
        ? excludesOrderStatuses
        : excludesOrderStatuses.split(",");
    }

    if (includeStatusesArray.length > 0) {
      filters.orderStatus = { $in: includeStatusesArray };
    } else if (excludeStatusesArray.length > 0) {
      filters.orderStatus = { $nin: excludeStatusesArray };
    } else {
      filters.orderStatus = { $nin: ["CANCELLED", "COMPLETED"] };
    }

    if (from) {
      if (!moment(from, "DD-MM-YYYY", true).isValid()) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use DD-MM-YYYY.",
        });
      }
      fromDate = moment.utc(from, "DD-MM-YYYY").startOf("day").toDate();
    }

    if (to) {
      if (!moment(to, "DD-MM-YYYY", true).isValid()) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use DD-MM-YYYY.",
        });
      }
      toDate = moment.utc(to, "DD-MM-YYYY").endOf("day").toDate();
    } else {
      toDate = today;
    }

    if (fromDate && toDate) {
      filters.createdAt = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
      filters.createdAt = { $gte: fromDate };
    } else if (toDate) {
      filters.createdAt = { $lte: toDate };
    }

    // Pagination logic
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const totalOrders = await Order.countDocuments(filters);
    const totalPages = Math.ceil(totalOrders / limitNumber);

    const orders = await Order.find(filters)
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 }); // Sorting by latest orders

    if (!orders.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        orders: [],
        message: "No orders found for the given filters.",
      });
    }

    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const buyerInfo = await User.findById(order.buyerInfo).select(
          "firstName lastName email contact"
        );
        const address = order.address.myAddress || "";

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
      totalOrders,
      totalPages,
      currentPage: pageNumber,
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

export const sellerOrders = async (req, res) => {
  try {
    const {
      from,
      to,
      includesOrderStatuses,
      excludesOrderStatuses,
      page = 1,
      limit = 5,
    } = req.query;

    const { role, id } = req.user;

    console.log("Seller ID:", id);

    if (role !== "2") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only sellers can view orders.",
      });
    }

    // Build initial filters
    const filters = { sellerInfo: new mongoose.Types.ObjectId(id) };

    const today = moment.utc().startOf("day").toDate();
    let fromDate, toDate;

    let includeStatusesArray = [];
    if (includesOrderStatuses) {
      includeStatusesArray = Array.isArray(includesOrderStatuses)
        ? includesOrderStatuses
        : includesOrderStatuses.split(",");
    }

    let excludeStatusesArray = [];
    if (excludesOrderStatuses) {
      excludeStatusesArray = Array.isArray(excludesOrderStatuses)
        ? excludesOrderStatuses
        : excludesOrderStatuses.split(",");
    }

    // Handle order statuses
    if (includeStatusesArray.length > 0) {
      filters.orderStatus = { $in: includeStatusesArray };
    } else if (excludeStatusesArray.length > 0) {
      filters.orderStatus = { $nin: excludeStatusesArray };
    }

    // Handle date filtering
    if (from) {
      if (!moment(from, "DD-MM-YYYY", true).isValid()) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use DD-MM-YYYY.",
        });
      }
      fromDate = moment.utc(from, "DD-MM-YYYY").startOf("day").toDate();
    }

    if (to) {
      if (!moment(to, "DD-MM-YYYY", true).isValid()) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use DD-MM-YYYY.",
        });
      }
      toDate = moment.utc(to, "DD-MM-YYYY").endOf("day").toDate();
    } else {
      toDate = today;
    }

    if (fromDate && toDate) {
      filters.createdAt = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
      filters.createdAt = { $gte: fromDate };
    } else if (toDate) {
      filters.createdAt = { $lte: toDate };
    }

    // Pagination
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch orders
    const totalOrders = await Order.countDocuments(filters);
    const totalPages = Math.ceil(totalOrders / limitNumber);

    const orders = await Order.find(filters)
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        orders: [],
        message: "No orders found for the given filters.",
      });
    }

    // Fetch Seller Information
    const sellerInfo = await User.findById(id).select(
      "firstName lastName email contact"
    );

    // Enrich orders with seller and address info
    const enrichedOrders = orders.map((order) => {
      const address = order.address.myAddress || "";
      const sellerProducts = order.products || [];

      return {
        orderId: order._id,
        orderStatus: order.orderStatus,
        sellerInfo,
        address,
        products: sellerProducts,
      };
    });

    console.log("Seller Orders", enrichedOrders);

    res.status(200).json({
      success: true,
      count: enrichedOrders.length,
      totalOrders,
      totalPages,
      currentPage: pageNumber,
      orders: enrichedOrders,
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};
