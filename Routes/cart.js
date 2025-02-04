import express from "express";
import {
  addToCart,
  getBuyerProductFromCart,
  removeProduct,
} from "../Controller/cart.js";
import { Authenticated } from "../Middleware/Auth.js";
import { fileUploadProduct } from "../Middleware/file-upload.js";

const router = express.Router();

router.post(
  "/addProducts",
  Authenticated,
  fileUploadProduct.single("image"),
  addToCart
);

router.get(
  "/getProducts",
  Authenticated,
  fileUploadProduct.single("image"),
  getBuyerProductFromCart
);

router.delete("/:id", Authenticated, removeProduct);

export default router;
