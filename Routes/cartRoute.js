import express from "express";
import {
  addToCart,
  getBuyerProductFromCart,
  removeProduct,
} from "../Controller/cartController.js";
import { Authenticated } from "../Middleware/Auth.js";
import { fileUploadProduct } from "../Middleware/file-upload.js";

const router = express.Router();

router.get(
  "/getProducts",
  Authenticated,
  fileUploadProduct.single("image"),
  getBuyerProductFromCart
);

router.post(
  "/addProducts",
  Authenticated,
  fileUploadProduct.single("image"),
  addToCart
);

router.delete("/:id", Authenticated, removeProduct);

export default router;
