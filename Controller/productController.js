import { Product } from "../Model/Product.js";
import { User } from "../Model/User.js";
import mongoose from "mongoose";
import statusCodeResponse from "../helpers/statusCodeResponse.js";

// role: Buyer =1, Seller =2
export const addProduct = async (req, res) => {
  const { name, description, price, qty, category, image } = req.body;
  const SellerId = req.user.id;
  const role = req.user.role;

  try {
    // Check if the user is a seller (roleId = 2)
    if (Number(role) !== 2) {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
      });
    }

    const existingProduct = await Product.findOne({ name, SellerId });

    if (existingProduct) {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.badRequest.message,
        success: false,
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      qty,
      SellerId,
      category,
      image: req.file ? req.file.path : "",
    });

    // console.log(object);
    // console.log(product.image.replace(/\\/g, "/"));

    if (!product) {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.badRequest.message,
        success: false,
      });
    }

    res
      .status(statusCodeResponse.success.code)
      .json({ message: statusCodeResponse.success.message, product });
  } catch (err) {
    console.error("Error while adding product", err);
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      error: err.message,
    });
  }
};

export const editProduct = async (req, res) => {
  const eid = req.params.eid;
  const userId = req.user.id;
  const userRole = req.user.role;
  console.log(userId);
  try {
    if (!mongoose.Types.ObjectId.isValid(eid)) {
      return res
        .status(statusCodeResponse.badRequest.code)
        .json({ message: statusCodeResponse.badRequest.message });
    }

    let product = await Product.findById(eid);
    // console.log("?", product);

    // check if the role is a buyer
    if (userRole == 1) {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    // seller can update
    product = await Product.findByIdAndUpdate(
      eid,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      product,
    });
  } catch (err) {
    console.log("Error while updating", err);
    res
      .status(statusCodeResponse.serverError.code)
      .json({ message: statusCodeResponse.serverError.message });
  }
};

export const deleteProduct = async (req, res) => {
  const id = req.params.id;
  const userRole = req.user.role;

  if (userRole == 1) {
    return res.status(statusCodeResponse.forbidden.code).json({
      message: statusCodeResponse.forbidden.message,
      success: false,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(statusCodeResponse.badRequest.code)
      .json({ message: statusCodeResponse.badRequest.message });
  }

  try {
    let product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res
        .status(statusCodeResponse.notFound.code)
        .json({ message: statusCodeResponse.notFound.message, success: false });
    }
    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      products: product || [],
    });
  } catch (err) {
    console.log("Error while deleting t");
  }
};

export const allProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const startIndex = (page - 1) * limit;
  const searchQuery = req.query.search || "";
  const minPrice = parseInt(req.query.minPrice) || 0;
  const maxPrice = parseInt(req.query.maxPrice) || Infinity;
  const brand = req.query.brand || "";
  const discount = parseInt(req.query.discount) || 0;
  const sortBy = req.query.sortBy || "createdAt";
  const order = req.query.order === "asc" ? 1 : -1;

  try {
    let queryConditions = {};

    if (searchQuery) {
      queryConditions.name = { $regex: searchQuery, $options: "i" };
    }

    queryConditions.price = { $gte: minPrice, $lte: maxPrice };

    if (brand) {
      queryConditions.brand = { $regex: brand, $options: "i" };
    }

    if (discount) {
      queryConditions.discount = { $gte: discount };
    }

    const totalProducts = await Product.countDocuments(queryConditions);

    if (startIndex >= totalProducts) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: "No products found for the given filters.",
        success: false,
      });
    }

    const products = await Product.find(queryConditions)
      .sort({ [sortBy]: order })
      .skip(startIndex)
      .limit(limit);

    res.status(statusCodeResponse.success.code).json({
      message: "Product data retrieved successfully",
      success: true,
      products,
      totalProducts,
      page,
      totalPages: Math.ceil(totalProducts / limit),
      limit,
    });
  } catch (err) {
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      error: err.message,
    });
  }
};

export const buyerProducts = async (req, res) => {
  const bid = req.params?.bid;
  const role = req.user?.role;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 3;
  const startIndex = (page - 1) * limit;
  const searchQuery = req.query.search || "";
  const minPrice = parseInt(req.query.minPrice) || 0;
  const maxPrice = parseInt(req.query.maxPrice) || Infinity;
  // const category = req.query.category || "";
  const { seek_id } = req.query;

  try {
    if (role !== "1") {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bid)) {
      return res.status(statusCodeResponse.badRequest.code).json({
        message: statusCodeResponse.badRequest.message,
        success: false,
      });
    }

    let queryConditions = {};

    if (seek_id && seek_id !== "null" && seek_id !== "undefined") {
      if (!mongoose.Types.ObjectId.isValid(seek_id)) {
        return res
          .status(statusCodeResponse.badRequest.code)
          .json({ message: statusCodeResponse.badRequest.message });
      }
      queryConditions._id = { $lt: new mongoose.Types.ObjectId(seek_id) };
    }

    if (searchQuery) {
      queryConditions.name = { $regex: searchQuery, $options: "i" };
    }

    queryConditions.price = { $gte: minPrice, $lte: maxPrice };

    // if (category) {
    //   queryConditions.category = { $regex: category, $options: "i" };
    // }

    // console.log("Query Conditions:", queryConditions);

    const totalProducts = await Product.countDocuments(queryConditions);

    if (searchQuery && totalProducts === 0) {
      return res.status(statusCodeResponse.success.code).json({
        message: statusCodeResponse.success.message,
        success: true,
        products: [],
      });
    }

    if (startIndex >= totalProducts) {
      return res.status(statusCodeResponse.success.code).json({
        message: statusCodeResponse.success.message,
        success: true,
        products: [],
      });
    }

    const products = await Product.find(queryConditions)
      .sort({ _id: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      products,
      totalProducts,
      page,
      totalPages: Math.ceil(totalProducts / limit),
      limit,
    });
  } catch (err) {
    console.error("Error while fetching products:", err);
    res.status(statusCodeResponse.badRequest.message).json({
      message: statusCodeResponse.badRequest.message,
      error: err.message,
    });
  }
};

export const sellerProductsBySeekId = async (req, res) => {
  const sid = req?.user?.id;
  const role = req.user?.role;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 2;
  const startIndex = (page - 1) * limit;
  const searchQuery = req.query.search || "";
  const seek_id = req.query.seek_id;

  try {
    if (role !== "2") {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    if (!sid || !mongoose.Types.ObjectId.isValid(sid)) {
      return res
        .status(statusCodeResponse.badRequest.code)
        .json({ message: statusCodeResponse.badRequest.message });
    }

    const user = await User.findById(sid);
    if (!user || user.role !== "2") {
      return res.status(403).json({
        message: "Not authorized or seller not found.",
        success: false,
      });
    }

    const query = {
      SellerId: sid,
      ...(searchQuery && { name: { $regex: searchQuery, $options: "i" } }),
    };

    if (seek_id && seek_id !== "null" && seek_id !== "undefined") {
      if (!mongoose.Types.ObjectId.isValid(seek_id)) {
        return res
          .status(statusCodeResponse.badRequest.code)
          .json({ message: statusCodeResponse.badRequest.message });
      }
      query._id = { $lt: new mongoose.Types.ObjectId(seek_id) };
    }

    const totalProducts = await Product.countDocuments(query);

    if (startIndex >= totalProducts && totalProducts > 0) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
        products: [],
      });
    }

    const products = await Product.find(query)
      .sort({ _id: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      products,
      totalProducts,
      page,
      totalPages: Math.ceil(totalProducts / limit),
      limit,
    });
  } catch (err) {
    console.error("Error while getting products by seller ID:", err);
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      error: err.message,
    });
  }
};

export const sellerProducts = async (req, res) => {
  const sid = req.params.sid;
  const role = req.user?.role;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 4;
  const startIndex = (page - 1) * limit;
  const searchQuery = req.query.search || "";

  try {
    if (!sid) {
      return res
        .status(statusCodeResponse.unauthorized.code)
        .json({ message: statusCodeResponse.unauthorized.message });
    }

    const user = await User.findById(sid);

    if (!user || role !== "2") {
      return res
        .status(statusCodeResponse.forbidden.code)
        .json({ message: statusCodeResponse.forbidden.message });
    }

    if (!mongoose.Types.ObjectId.isValid(sid)) {
      return res.status(400).json({ message: "Invalid seller ID format" });
    }

    // Build query conditions
    const query = {
      SellerId: sid,
      ...(searchQuery && { name: { $regex: searchQuery, $options: "i" } }),
    };

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalProducts = await Product.countDocuments(query);

    // Check if no products are found
    if (searchQuery && totalProducts === 0) {
      return res.status(statusCodeResponse.success.code).json({
        message: statusCodeResponse.success.message,
        success: true,
        products: [],
      });
    }

    if (startIndex >= totalProducts && totalProducts > 0) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
        products: [],
      });
    }

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      products,
      totalProducts,
      page,
      totalPages: Math.ceil(totalProducts / limit),
      limit,
    });
  } catch (err) {
    console.error("Error while getting products by seller ID", err);
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      error: err.message,
    });
  }
};
