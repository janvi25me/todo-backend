import express from "express";
import {
  getProfile,
  login,
  profile,
  signup,
} from "../Controller/userController.js";
import { fileUpload } from "../Middleware/file-upload.js";
import { Authenticated } from "../Middleware/Auth.js";
const router = express.Router();

// router.post("/register", register);

router.get(
  "/profile/getProfile",
  //   fileUpload.single("image"),
  Authenticated,
  getProfile
);

router.post("/signup", fileUpload.single("image"), signup);
router.post("/login", login);
router.post("/profile", Authenticated, fileUpload.single("image"), profile);

export default router;
