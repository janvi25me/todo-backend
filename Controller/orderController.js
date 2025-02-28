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

    const buyerInfo = await User.findById(buyerId).select(
      "firstName middleName lastName email role contact"
    );

    if (!buyerInfo) {
      return res.status(404).json({
        message: "Buyer information not found.",
        success: false,
      });
    }

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
    const orderProducts = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId).select(
          "SellerId"
        );

        if (!product) {
          throw new Error(`Product not found for ID: ${item.productId}`);
        }

        if (!product.SellerId) {
          throw new Error(
            `Seller ID missing for product ID: ${item.productId}. Please check the product data.`
          );
        }

        // console.log("SellerID in createOrder", product.SellerId);

        return {
          productId: item.productId,
          SellerId: product.SellerId, // Map SellerId to sellerId
          name: item.name,
          price: item.price,
          qty: item.qty,
          image: item.image,
          totalPrice: item.price * item.qty,
          productStatus: item.productStatus,
        };
      })
    );

    const { subTotal, total, delivery, noOfProducts } = calculateCartTotals(
      cart.items
    );

    const order = new Order({
      orderStatus: "PENDING",
      buyerInfo: buyerInfo,
      address: myAddress,
      products: orderProducts,
      subtotal: subTotal,
      total,
      delivery,
      noOfProducts: noOfProducts,
    });

    // console.log("#", orderProducts);

    await order.save();

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
      error: error.message,
    });
  }
};

export const fetchOrders = async (req, res) => {
  const userId = req?.user?.id;
  const role = req?.user?.role;
  const orderId = req.params.orderId;

  try {
    if (role !== "1" && role !== "2") {
      return res.status(403).json({
        message: "Unauthorized access.",
        success: false,
      });
    }

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required.",
        success: false,
      });
    }

    const order = await Order.findOne({ _id: orderId }).select(
      "orderStatus deliveryStatus subtotal delivery total createdAt products noOfProducts buyerInfo address"
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
        success: false,
      });
    }

    // console.log("%", order);

    const payment = await Payment.findOne({ orderId }).select("paymentStatus");
    const buyerInfo = order.buyerInfo
      ? await User.findById(order.buyerInfo).select(
          "firstName middleName lastName email contact"
        )
      : null;

    // console.log("^", payment);

    const address = order.address
      ? await Address.findById(order.address).select("myAddress")
      : null;

    // Filter products based on role
    let filteredProducts = [];

    if (role === "1") {
      // Buyer - See all products
      filteredProducts = await Promise.all(
        order.products.map(async (productItem) => {
          const product = await Product.findById(productItem.productId).select(
            "name price image qty  "
          );

          if (!product) {
            return {
              productId: productItem.productId,
              productNotFound: true,
              qty: productItem.qty,
              totalPrice: productItem.totalPrice,
            };
          }
          // console.log("$", product);
          return {
            ...product.toObject(),
            qty: productItem.qty,
            totalPrice: productItem.totalPrice,
            productStatus: productItem.productStatus,
            deliveryOtp: productItem.deliveryOtp,
          };
        })
      );
    } else if (role === "2") {
      // console.log("Order products:", order.products);
      // console.log("Seller ID from auth:", userId);

      // console.log("$", order);
      filteredProducts = await Promise.all(
        order.products
          .filter((productItem) => {
            return productItem.SellerId?.equals(userId);
          })

          .map(async (productItem) => {
            const product = await Product.findById(
              productItem.productId
            ).select("name price image qty description productStatus");

            // console.log("$#%", order.products);

            if (!product) {
              return {
                productId: productItem.productId,
                productNotFound: true,
                qty: productItem.qty,
                totalPrice: productItem.totalPrice,
              };
            }

            // console.log("Seller ID from auth:", userId);
            // console.log(
            //   "Filtered Product's sellerId:",
            //   productItem?.SellerId?.toString()
            // );

            return {
              ...product.toObject(),
              qty: productItem.qty,
              totalPrice: productItem.totalPrice,
              productStatus: productItem.productStatus,
              deliveryOtp: productItem.deliveryOtp,
            };
          })
      );
    }
    const orderDetails = {
      ...order.toObject(),
      buyerInfo,
      address,
      products: filteredProducts,
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
      limit = 10,
    } = req.query;
    const { role, id } = req.user;

    if (role !== "2") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only sellers can view orders.",
      });
    }

    // Convert seller ID to ObjectId
    const sellerObjectId = new mongoose.Types.ObjectId(id);

    const filters = { "products.SellerId": sellerObjectId };
    let fromDate, toDate;

    let includeStatusesArray = includesOrderStatuses?.split(",") || [];
    let excludeStatusesArray = excludesOrderStatuses?.split(",") || [];

    if (includeStatusesArray.length > 0) {
      filters.orderStatus = { $in: includeStatusesArray };
    } else if (excludeStatusesArray.length > 0) {
      filters.orderStatus = { $nin: excludeStatusesArray };
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
    }

    if (fromDate && toDate) {
      filters.createdAt = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
      filters.createdAt = { $gte: fromDate };
    } else if (toDate) {
      filters.createdAt = { $lte: toDate };
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

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
        message: "No orders found for this seller with the given filters.",
      });
    }

    // Ensure only products of the current seller are returned
    const filteredOrders = orders
      .map((order) => ({
        ...order.toObject(),
        products: order.products.filter(
          (product) => product.SellerId.toString() === sellerObjectId.toString()
        ),
      }))
      .filter((order) => order.products.length > 0);

    // console.log("Filtered seller orders", filteredOrders);

    res.status(200).json({
      success: true,
      count: filteredOrders.length,
      totalOrders,
      totalPages,
      currentPage: pageNumber,
      orders: filteredOrders,
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch seller orders",
      error: error.message,
    });
  }
};

export const updateOrderDetails = async (req, res) => {
  const { orderId, action, productId } = req.body;
  const role = req?.user?.role;
  const otp = Math.floor(100000 + Math.random() * 900000);
  try {
    if (role !== "2") {
      return res.status(403).json({
        message: "Only sellers can update order details.",
        success: false,
      });
    }
    try {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, "products.productId": { $in: productId } },
        {
          $set: {
            "products.$[elem].productStatus": action,
            "products.$[elem].deliveryOtp": otp,
          },
        },
        {
          arrayFilters: [{ "elem.productId": { $in: productId } }],
          new: true,
        }
      );

      if (!updatedOrder) {
        return res.status(200).json({
          message: "Order not found.",
          success: false,
        });
      }

      //check if all product status is complete then update main status
      const allStatuses = updatedOrder.products.map(
        (product) => product.productStatus
      );

      const uniqueStatuses = [...new Set(allStatuses)];

      if (uniqueStatuses.length === 1) {
        const unifiedStatus = uniqueStatuses[0];

        // Update the orderStatus if all products have the same status
        if (["IN_TRANSIT", "COMPLETED"].includes(unifiedStatus)) {
          updatedOrder.orderStatus = unifiedStatus;
          await updatedOrder.save();
        }
      }
      // console.log("Updated Order", updatedOrder);
      return res.status(200).json({
        message: "Order Updated.",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        message: "An error occurred while updating order details.",
        success: false,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error in updateOrderDetails:", error);
    res.status(500).json({
      message: "An error occurred while updating order details.",
      success: false,
      error: error.message,
    });
  }
};
export const verifyOtp = async (req, res) => {
  const { orderId, productId, otp } = req.body;
  const role = req?.user?.role;

  try {
    if (role !== "2") {
      return res.status(403).json({
        message: "Only sellers can verify OTP details.",
        success: false,
      });
    }

    // OTP validation
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      return res.status(400).json({
        message: "Invalid OTP format. OTP must be exactly 6 digits.",
        success: false,
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      "products.productId": productId,
      "products.deliveryOtp": otp,
    });

    if (!order) {
      return res.status(400).json({
        message: "Invalid OTP",
        success: false,
      });
    }

    // Check payment status in the payment collection using orderId
    const payment = await Payment.findOne({ orderId: order._id });

    if (!payment) {
      return res.status(404).json({
        message: "Payment record not found.",
        success: false,
      });
    }

    if (payment.paymentStatus !== "SUCCESS") {
      return res.status(400).json({
        message: "Payment status is not successful.",
        success: false,
      });
    }

    // Update order status to COMPLETED
    await Order.updateOne(
      { _id: orderId },
      { $set: { orderStatus: "COMPLETED" } }
    );

    // Update product status to COMPLETED
    await Order.updateOne(
      { _id: orderId, "products.productId": productId },
      { $set: { "products.$.productStatus": "COMPLETED" } }
    );

    return res.status(200).json({
      message: "OTP verified, order and product completed.",
      success: true,
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(500).json({
      message:
        "An error occurred while verifying OTP and updating order/product status.",
      success: false,
      error: error.message,
    });
  }
};
