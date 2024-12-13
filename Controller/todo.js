import { Todo } from "../Model/Todo.js";
import mongoose from "mongoose";
import { User } from "../Model/User.js";

export const addTodo = async (req, res) => {
  const { name, description, price } = req.body;
  const SellerId = req.user.id;
  // console.log("user id", SellerId);
  // console.log(req.body);

  try {
    const todo = await Todo.create({
      name,
      description,
      price,
      SellerId,
    });

    if (!todo) {
      return res.status(400).json({ message: "There is no todo item found" });
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
  //   console.log("Edit id is ", eid);
  //   console.log(req.body);

  if (!mongoose.Types.ObjectId.isValid(eid)) {
    return res.status(400).json({ message: "Invalid todo ID format" });
  }
  try {
    let todo = await Todo.findByIdAndUpdate(
      eid,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!todo) {
      return res
        .status(404)
        .json({ message: "todo not found", success: false });
    }
    res.status(200).json({ message: "Data updated", success: true, todo });
  } catch (err) {
    console.log("Error while updating", err);
  }
};

// export const editTodo = async (req, res) => {
//   const eid = req.params.eid;
//   const { id: userId, role } = req.user;

//   if (!mongoose.Types.ObjectId.isValid(eid)) {
//     return res.status(400).json({ message: "Invalid todo ID format" });
//   }

//   try {
//     const todo = await Todo.findById(eid);

//     if (!todo) {
//       return res
//         .status(404)
//         .json({ message: "Todo not found", success: false });
//     }

//     if (role === "1") {
//       if (todo.SellerId !== userId) {
//         return res.status(403).json({
//           message: "Not authorized. Buyers can only edit their own todos.",
//           success: false,
//         });
//       }
//     } else if (role === "2") {
//       if (todo.SellerId && todo.SellerId !== userId) {
//         return res.status(403).json({
//           message: "Not authorized. Sellers cannot edit other sellers' todos.",
//           success: false,
//         });
//       }
//     } else {
//       return res.status(403).json({
//         message: "Not authorized. Only buyers and sellers can edit todos.",
//         success: false,
//       });
//     }

//     const updatedTodo = await Todo.findByIdAndUpdate(
//       eid,
//       { $set: req.body },
//       {
//         new: true,
//         runValidators: true,
//       }
//     );

//     res.status(200).json({
//       message: "Todo updated successfully",
//       success: true,
//       todo: updatedTodo,
//     });
//   } catch (err) {
//     console.error("Error while updating todo", err);
//     res.status(500).json({
//       message: "Internal server error",
//       error: err.message,
//     });
//   }
// };

export const deleteTodo = async (req, res) => {
  const id = req.params.id;
  //   console.log("ID for delete todo", id);

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
      return res.status(400).json({ message: "Data not found" });
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
      todos = await Todo.find({ SellerId: id });
    } else {
      return res.status(403).json({
        message: "Access denied. Only buyers can fetch their todos.",
        success: false,
      });
    }

    if (!todos || todos.length === 0) {
      return res.status(400).json({
        message: "No todos found for this buyer.",
        success: false,
      });
    }

    res.status(200).json({ message: "Data items found", success: true, todos });
  } catch (err) {
    console.error("Error while getting todos by user ID", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const getPRoductBySellerId = async (req, res) => {
  const sid = req.user?.id;
  // console.log("*", req?.user);
  // console.log("Admin id", aid);
  if (!sid) {
    return res.status(401).json({ message: "User not authenticated." });
  }
  // console.log("Seller id", sid);

  try {
    const user = await User.findById(sid);
    if (!user || user.role !== "2") {
      return res
        .status(403)
        .json({ message: "Not authorized. Admin required." });
    }

    let todos = await Todo.find({ SellerId: sid });

    if (!todos || todos.length === 0) {
      return res
        .status(400)
        .json({ message: "No todos found for this admin", success: false });
    }

    res.status(200).json({ message: "Data items found", success: true, todos });
  } catch (err) {
    console.log("Error while getting todos by admin ID", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
