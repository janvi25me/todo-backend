import express from "express";
import { Authenticated } from "../Middleware/Auth.js";
import {
  getUserAddress,
  addUserAddress,
  editUserAddress,
  deleteUserAddress,
  updateDefaultAddress,
} from "../Controller/address.js";

const router = express.Router();

router.post("/addAddress", Authenticated, addUserAddress);

router.get("/getAddress", Authenticated, getUserAddress);

router.patch("/editAddress/:eid", Authenticated, editUserAddress);

router.patch("/updateDefaultAddress/:aid", Authenticated, updateDefaultAddress);

router.delete("/deleteAddress/:rid", Authenticated, deleteUserAddress);

export default router;
