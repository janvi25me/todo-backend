import express from "express";
import { getProfile, login, profile, signup } from "../Controller/user.js";
import { fileUpload } from "../Middleware/file-upload.js";
import { Authenticated } from "../Middleware/Auth.js";
const router = express.Router();

// router.post("/register", register);

//register
router.post("/signup", fileUpload.single("image"), signup);

//login
router.post("/login", login);

router.post("/profile", Authenticated, fileUpload.single("image"), profile);

router.get(
  "/profile/getProfile",
  //   fileUpload.single("image"),
  Authenticated,
  getProfile
);

export default router;
