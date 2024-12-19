import express from "express";
import {
  addProduct,
  deleteProduct,
  editProduct,
  //   getTodos,
  allProducts,
  buyerProducts,
  sellerProducts,
  //   getAllProducts,
} from "../Controller/todo.js";
import { Authenticated } from "../Middleware/Auth.js";

const router = express.Router();

router.post("/add", Authenticated, addProduct);

router.patch("/edit/:eid", Authenticated, editProduct); // api/todo/edit/65364654354

router.delete("/:id", Authenticated, deleteProduct);

router.get("/all", Authenticated, allProducts);

router.get("/buyer/:bid", Authenticated, buyerProducts);

router.get("/seller/:sid", Authenticated, sellerProducts);

// router.get("/admin/:aid", getAllProducts);
// router.get("/getTodo", Authenticated, getTodos);
export default router;
