import express from "express";
import {
  addTodo,
  deleteTodo,
  editTodo,
  //   getTodos,
  allTodos,
  getProductByBuyerId,
  getProductBySellerId,
  //   getAllProducts,
} from "../Controller/todo.js";
import { Authenticated } from "../Middleware/Auth.js";

const router = express.Router();

router.post("/add", Authenticated, addTodo);

router.patch("/edit/:eid", Authenticated, editTodo); // api/todo/edit/65364654354

router.delete("/:id", Authenticated, deleteTodo);

router.get("/all", Authenticated, allTodos);

router.get("/buyer/:bid", Authenticated, getProductByBuyerId);

router.get("/seller/:sid", Authenticated, getProductBySellerId);

// router.get("/admin/:aid", getAllProducts);
// router.get("/getTodo", Authenticated, getTodos);
export default router;
