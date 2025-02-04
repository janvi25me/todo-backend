import { Cart } from "../Model/Cart.js";

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
      return res.status(403).json({
        message: "Only buyers can add items to cart",
        success: false,
      });
    }

    // const image = req.body.image?.replace(/\\/g, "/");
    if (
      !productId ||
      !description ||
      !name ||
      !price ||
      !image ||
      !Number.isInteger(qty) ||
      qty < 1
    ) {
      return res.status(400).json({
        message: "All fields are required and qty must be at least 1",
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

    res.status(200).json({
      message: "Item added to cart successfully.",
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
    return res.status(500).json({
      message: "An error occurred while adding items to cart",
      success: false,
    });
  }
};

export const getBuyerProductFromCart = async (req, res) => {
  const buyerId = req?.user?.id;
  try {
    const cart = await Cart.findOne({ buyerId });
    if (!cart) {
      return res.status(404).json({
        message: "No cart found.",
        success: false,
      });
    }

    if (cart.items.length === 0) {
      cart.items = [];
    }

    const { subTotal, total, delivery, noOfProducts } = calculateCartTotals(
      cart.items
    );

    res.status(200).json({
      message: "User Cart retrieved successfully.",
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
    return res.status(500).json({
      message: "An error occurred while retrieving the cart.",
      success: false,
    });
  }
};

export const removeProduct = async (req, res) => {
  const id = req.params.id; // Product _id
  const buyerId = req.user.id;
  const role = req.user.role;

  if (!id) {
    return res.status(400).json({
      message: "Product ID is required",
      success: false,
    });
  }

  try {
    if (Number(role) !== 1) {
      return res.status(403).json({
        message: "You are not allowed to edit this product",
        success: false,
      });
    }

    let cart = await Cart.findOne({ buyerId });

    if (!cart) {
      return res.status(404).json({
        message: "No cart found for this buyer",
        success: false,
      });
    }

    const existingItems = cart.items.filter(
      (item) => item._id.toString() !== id
    );

    if (existingItems.length === cart.items.length) {
      return res.status(404).json({
        message: "Product not found in the cart",
        success: false,
      });
    }

    cart.items = existingItems;

    const { subTotal, total, delivery, noOfProducts } = calculateCartTotals(
      cart.items
    );

    // Save the updated cart
    await cart.save();

    return res.status(200).json({
      message: "Product removed from cart",
      success: true,
      noOfProducts,
      subTotal,
      total,
      delivery,
    });
  } catch (err) {
    console.error("Error while removing product:", err);
    return res.status(500).json({
      message: "Error occurred while removing product from cart",
      success: false,
    });
  }
};
