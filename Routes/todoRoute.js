import express from "express";
import {
  addTodo,
  allTodos,
  deleteTodo,
  editTodo,
  getTodoById,
} from "../Controller/todo.js";

const router = express.Router();

router.post("/add", addTodo);

router.patch("/edit/:eid", editTodo); // api/todo/edit/65364654354

router.delete("/:id", deleteTodo);

router.get("/all", allTodos);

router.get("/:tid", getTodoById);

export default router;
