import { Todo } from "../Model/Todo.js";
import mongoose from "mongoose";

export const addTodo = async (req, res) => {
  const { tag, description } = req.body;
  //   console.log(req.body);

  try {
    const todo = await Todo.create({
      tag,
      description,
    });
    if (!todo) {
      res.status(400).json({ message: "There is no todo item found" });
    }
    await todo.save();
    res.status(200).json({ message: "Todo item created", todo });
  } catch (err) {
    console.log("Error while adding todo", err);
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

export const getTodoById = async (req, res) => {
  const tid = req.params.tid;
  //   console.log("Todo id", tid);
  try {
    let todo = await Todo.findById(tid);
    if (!todo) {
      return res
        .status(400)
        .json({ message: "Not found bt id", success: false });
    }
    res.status(200).json({ message: "Data Item found", success: true, todo });
  } catch (err) {
    console.log("Error while getting todo by id", err);
  }
};
