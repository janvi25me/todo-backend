import { Cart } from "../Model/Cart.js";
import statusCodeResponse from "../helpers/statusCodeResponse.js";
// import { Product } from "../Model/Product.js";

//Function to calculate total,subtotal & delivery
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

export const addToCart = async (req, res) => {
  const { productId, description, name, price, image, qty } = req.body;
  const buyerId = req.user.id;
  const role = req.user.role;

  try {
    if (Number(role) !== 1) {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }
    if (
      !productId ||
      !description ||
      !name ||
      !price ||
      !image ||
      !Number.isInteger(qty) ||
      qty < 1
    ) {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    let cart = await Cart.findOne({ buyerId });
    if (!cart) {
      cart = new Cart({ buyerId, items: [] });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].qty += qty;
    } else {
      cart.items.push({
        productId,
        name,
        description,
        price,
        image,
        qty,
      });
    }

    const { subTotal, total, delivery, noOfProducts } = calculateCartTotals(
      cart.items
    );

    await cart.save();

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      data: {
        ...cart.toObject(),
        delivery,
        subTotal,
        total,
        noOfProducts,
      },
    });
  } catch (err) {
    console.error("Error in addToCart:", err);
    return res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      success: false,
    });
  }
};

export const getBuyerProductFromCart = async (req, res) => {
  const buyerId = req?.user?.id;
  try {
    const cart = await Cart.findOne({ buyerId });
    if (!cart) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
      });
    }

    if (cart.items.length === 0) {
      cart.items = [];
    }

    const { subTotal, total, delivery, noOfProducts } = calculateCartTotals(
      cart.items
    );

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      data: {
        ...cart.toObject(),
        delivery,
        subTotal,
        total,
        noOfProducts,
      },
    });
  } catch (err) {
    console.error("Error in getBuyerProductFromCart:", err);
    return res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      success: false,
    });
  }
};

export const removeProduct = async (req, res) => {
  const id = req.params.id; // Product _id
  const buyerId = req.user.id;
  const role = req.user.role;

  if (!id) {
    return res.status(statusCodeResponse.badRequest.code).json({
      message: statusCodeResponse.badRequest.message,
      success: false,
    });
  }

  try {
    if (Number(role) !== 1) {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    let cart = await Cart.findOne({ buyerId });

    if (!cart) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
      });
    }

    const existingItems = cart.items.filter(
      (item) => item._id.toString() !== id
    );

    if (existingItems.length === cart.items.length) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
      });
    }

    cart.items = existingItems;

    const { subTotal, total, delivery, noOfProducts } = calculateCartTotals(
      cart.items
    );

    // Save the updated cart
    await cart.save();

    return res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      noOfProducts,
      subTotal,
      total,
      delivery,
    });
  } catch (err) {
    console.error("Error while removing product:", err);
    return res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      success: false,
    });
  }
};
