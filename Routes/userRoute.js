import express from "express";
import { login, signup } from "../Controller/user.js";

const router = express.Router();

//register
router.post("/signup", signup);

//login
router.post("/login", login);

export default router;
