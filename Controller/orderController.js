import { Order } from "../Model/Order.js";
import { Cart } from "../Model/Cart.js";
import { User } from "../Model/User.js";
import { Address } from "../Model/Address.js";
import { Product } from "../Model/Product.js";
import { Payment } from "../Model/Payment.js";
import moment from "moment";
import mongoose from "mongoose";
import statusCodeResponse from "../helpers/statusCodeResponse.js";

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
      return res.status(statusCodeResponse.serviceUnavailable.code).json({
        message: statusCodeResponse.serviceUnavailable.message,
        success: false,
      });
    }

    const cart = await Cart.findOne({ buyerId });
    if (!cart) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
      });
    }

    const buyerInfo = await User.findById(buyerId).select(
      "firstName middleName lastName email role contact"
    );

    if (!buyerInfo) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
      });
    }

    const myAddress = await Address.findOne({
      buyerId,
      isDefault: true,
    }).select("_id myAddress");

    if (!myAddress) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
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

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    return res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
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
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    if (!orderId) {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.badRequest.message,
        success: false,
      });
    }

    const order = await Order.findOne({ _id: orderId }).select(
      "orderStatus deliveryStatus subtotal delivery total createdAt products noOfProducts buyerInfo address"
    );

    if (!order) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
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

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      data: orderDetails,
    });
  } catch (error) {
    console.error("Error in fetchOrders:", error);
    return res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
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
      return res.status(statusCodeResponse.forbidden.code).json({
        success: false,
        message: statusCodeResponse.forbidden.code,
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
        return res.status(statusCodeResponse.badRequest.code).json({
          success: false,
          message: statusCodeResponse.badRequest.message,
        });
      }
      fromDate = moment.utc(from, "DD-MM-YYYY").startOf("day").toDate();
    }

    if (to) {
      if (!moment(to, "DD-MM-YYYY", true).isValid()) {
        return res.status(statusCodeResponse.badRequest.code).json({
          success: false,
          message: statusCodeResponse.badRequest.message,
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
      return res.status(statusCodeResponse.success.code).json({
        success: true,
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        orders: [],
        message: statusCodeResponse.badRequest.message,
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

    res.status(statusCodeResponse.success.code).json({
      success: true,
      count: enrichedOrders.length,
      totalOrders,
      totalPages,
      currentPage: pageNumber,
      orders: enrichedOrders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(statusCodeResponse.serverError.code).json({
      success: false,
      message: statusCodeResponse.badRequest.message,
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
      return res.status(statusCodeResponse.forbidden.code).json({
        success: false,
        message: statusCodeResponse.forbidden.message,
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
        return res.status(statusCodeResponse.badRequest.code).json({
          success: false,
          message: statusCodeResponse.badRequest.code,
        });
      }
      fromDate = moment.utc(from, "DD-MM-YYYY").startOf("day").toDate();
    }

    if (to) {
      if (!moment(to, "DD-MM-YYYY", true).isValid()) {
        return res.status(statusCodeResponse.badRequest.code).json({
          success: false,
          message: statusCodeResponse.badRequest.code,
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
      return res.status(statusCodeResponse.success.code).json({
        success: true,
        count: 0,
        totalPages: 0,
        currentPage: pageNumber,
        orders: [],
        message: statusCodeResponse.success.code,
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

    res.status(statusCodeResponse.success.code).json({
      success: true,
      count: filteredOrders.length,
      totalOrders,
      totalPages,
      currentPage: pageNumber,
      orders: filteredOrders,
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    res.status(statusCodeResponse.serverError.code).json({
      success: false,
      message: statusCodeResponse.serverError.code,
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
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
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
        return res.status(statusCodeResponse.notFound.code).json({
          message: "Order or product not found.",
          success: false,
        });
      }

      // Check if all product statuses are COMPLETED
      const allCompleted = updatedOrder.products.every(
        (product) => product.productStatus === "COMPLETED"
      );

      if (allCompleted) {
        updatedOrder.orderStatus = "COMPLETED";
        await updatedOrder.save();
      }

      return res.status(statusCodeResponse.success.code).json({
        message: "Order updated successfully.",
        success: true,
        updatedOrder,
      });
    } catch (error) {
      res.status(statusCodeResponse.serverError.code).json({
        message: statusCodeResponse.serverError.message,
        success: false,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error in updateOrderDetails:", error);
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
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
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    // OTP validation
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.badRequest.message,
        success: false,
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      "products.productId": productId,
      "products.deliveryOtp": otp,
    });

    if (!order) {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.badRequest.message,
        success: false,
      });
    }

    // Check payment status in the payment collection using orderId
    const payment = await Payment.findOne({ orderId: order._id });

    if (!payment) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
      });
    }

    if (payment.paymentStatus !== "SUCCESS") {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.badRequest.message,
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

    return res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      success: false,
      error: error.message,
    });
  }
};

export const cancelOrder = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    const order = await Order.findById(orderId).populate(
      "products.SellerId",
      "firstName lastName role _id"
    );

    if (!order) {
      return res
        .status(statusCodeResponse.notFound.code)
        .json({ message: statusCodeResponse.notFound.message });
    }

    // console.log("Logged-in User ID:", userId);
    // console.log("Logged-in User Role:", userRole);
    // console.log("Order Buyer ID:", order?.buyerInfo?.toString());

    if (order.paymentStatus === "SUCCESS") {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.badRequest.message,
      });
    }

    if (!order?.buyerInfo) {
      return res
        .status(statusCodeResponse.badRequest.code)
        .json({ message: statusCodeResponse.badRequest.message });
    }

    // Allow only the buyer to cancel
    if (
      userRole !== "1" ||
      !new mongoose.Types.ObjectId(userId).equals(order.buyerInfo)
    ) {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.badRequest.message,
        details: {
          expectedBuyerId: order.buyerInfo.toString(),
          actualUserId: userId,
          role: userRole,
        },
      });
    }

    // Cancel the entire order
    order.orderStatus = "CANCELLED";
    order.products.forEach((product) => (product.productStatus = "CANCELLED"));
    order.cancelledBy = "BUYER";

    await order.save();

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      order,
      success: true,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res
      .status(statusCodeResponse.serverError.code)
      .json({ message: statusCodeResponse.serverError.message, error });
  }
};
