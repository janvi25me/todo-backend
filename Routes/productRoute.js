import express from "express";
import {
  addProduct,
  deleteProduct,
  editProduct,
  //   getTodos,
  allProducts,
  buyerProducts,
  sellerProducts,
  sellerProductsBySeekId,
  //   getAllProducts,
} from "../Controller/productController.js";
import { Authenticated } from "../Middleware/Auth.js";
import { fileUploadProduct } from "../Middleware/file-upload.js";

const router = express.Router();

router.get("/all", Authenticated, allProducts);
router.get("/buyer/:bid", Authenticated, buyerProducts);
router.get("/seller/v1/:sid", Authenticated, sellerProducts);
router.get("/seller/:sid", Authenticated, sellerProductsBySeekId);

router.post(
  "/add",
  Authenticated,
  fileUploadProduct.single("image"),
  addProduct
);

router.patch("/edit/:eid", Authenticated, editProduct); // api/todo/edit/65364654354

router.delete("/:id", Authenticated, deleteProduct);

export default router;
