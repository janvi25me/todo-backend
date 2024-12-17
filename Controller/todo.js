import { Todo } from "../Model/Todo.js";
import { User } from "../Model/User.js";
import mongoose from "mongoose";

// role: Buyer =1, Seller =2

export const addTodo = async (req, res) => {
  const { name, description, price } = req.body;
  const SellerId = req.user.id;
  const role = req.user.role;

  console.log("Role:", role, "Type:", typeof role);
  console.log(req.body);

  try {
    if (Number(role) !== 2) {
      return res.status(403).json({
        message: "Unauthorized: Only sellers (roleId = 2) can add products",
      });
    }

    const todo = await Todo.create({
      name,
      description,
      price,
      SellerId,
    });

    if (!todo) {
      return res
        .status(400)
        .json({ message: "There is no todo item found", success: false, todo });
    }

    res.status(200).json({ message: "Todo item created", todo });
  } catch (err) {
    console.error("Error while adding todo", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

export const editTodo = async (req, res) => {
  const eid = req.params.eid;
  const userId = req.user.id;
  const userRole = req.user.role;
  console.log(userId);
  try {
    if (!mongoose.Types.ObjectId.isValid(eid)) {
      return res.status(400).json({ message: "Invalid todo ID format" });
    }

    let todo = await Todo.findById(eid);

    // check if the user is a buyer
    if (userRole == 1) {
      return res.status(403).json({
        message: "You are not allowed to edit this product",
        success: false,
      });
    }

    //check if the user is not seller
    // if (userRole !== 2) {
    //   return res.status(403).json({
    //     message: "Only sellers can edit products",
    //     success: false,
    //   });
    // }

    // seller can update
    todo = await Todo.findByIdAndUpdate(
      eid,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({ message: "Todo updated", success: true, todo });
  } catch (err) {
    console.log("Error while updating", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteTodo = async (req, res) => {
  const id = req.params.id;
  const userRole = req.user.role;
  //   console.log("ID for delete todo", id);

  if (userRole == 1) {
    return res.status(403).json({
      message: "You are not allowed to edit this product",
      success: false,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid todo ID format" });
  }

  try {
    let todo = await Todo.findByIdAndDelete(id);
    if (!todo) {
      return res
        .status(404)
        .json({ message: "Invalid ID, try again", success: false });
    }
    res.status(200).json({ message: "Item deleted", success: true });
  } catch (err) {
    console.log("Error while deleting t");
  }
};

export const getTodos = async (req, res) => {
  const { id, role } = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const startIndex = (page - 1) * limit;

  try {
    let todos;

    if (role === "admin") {
      todos = await Todo.find()
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limit);
    } else {
      todos = await Todo.find({ SellerId: id })
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limit);
    }

    const totalTodos = await Todo.countDocuments();

    if (!todos || todos.length === 0) {
      return res
        .status(400)
        .json({ message: "No todos found", success: false });
    }

    res.status(200).json({
      message: "Todos fetched successfully",
      success: true,
      todos,
      totalTodos,
      page,
      totalPages: Math.ceil(totalTodos / limit),
      limit,
    });
  } catch (err) {
    console.log("Error while fetching todos", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const allTodos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const startIndex = (page - 1) * limit;

    let todos = await Todo.find()
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalTodos = await Todo.countDocuments();

    if (!todos || todos.length === 0) {
      return res.status(400).json({ message: "Data not found", todos });
    }
    res.status(200).json({
      message: "Todo Data",
      success: true,
      todos,
      totalTodos,
      page,
      totalPages: Math.ceil(totalTodos / limit),
      limit,
    });
  } catch (err) {
    console.log("Error while fetching todos", err);
  }
};

export const getProductByBuyerId = async (req, res) => {
  const { id, role } = req.user;

  try {
    let todos;

    if (role === "1") {
      todos = await Todo.find();
    } else {
      return res.status(403).json({
        message: "Access denied. Only buyers can fetch products.",
        success: false,
      });
    }

    if (!todos || todos.length === 0) {
      return res.status(400).json({
        message: "No products found.",
        success: false,
        todos,
      });
    }

    res.status(200).json({
      message: "Products retrieved successfully.",
      success: true,
      todos,
    });
  } catch (err) {
    console.error("Error while getting products", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const getProductBySellerId = async (req, res) => {
  const sid = req.params.sid;
  const role = req.user?.role;

  // console.log(req.params);
  console.log(" Seller ID from url:", sid);

  if (!sid) {
    return res.status(401).json({ message: "User not authenticated." });
  }

  try {
    const user = await User.findById(sid);

    if (!user || role !== "2") {
      return res
        .status(403)
        .json({ message: "Not authorized. Seller role required." });
    }

    if (!mongoose.Types.ObjectId.isValid(sid)) {
      return res.status(400).json({ message: "Invalid seller ID format" });
    }

    const todos = await Todo.find({
      SellerId: new mongoose.Types.ObjectId(sid),
    });

    if (!todos || todos.length === 0) {
      return res.status(404).json({
        message: "No products found for this seller",
        success: false,
        todos,
      });
    }
    res.status(200).json({
      message: "Products retrieved successfully",
      success: true,
      todos,
    });
  } catch (err) {
    console.error("Error while getting products by seller ID", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
