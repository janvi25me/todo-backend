import jwt from "jsonwebtoken";
import { User } from "../Model/User.js";

export const Authenticated = async (req, res, next) => {
  const token = req.header("Auth");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Login required. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "$@#%^&*()~");
    const userId = decoded.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    req.user = { id: user._id, role: user.role, email: user.email };

    // console.log("Middleware user id", req.user.id);
    next();
  } catch (error) {
    console.error("Error in Authenticated middleware:", error);
    res.status(401).json({
      message: "Unauthorized. Invalid or expired token.",
      error: error.message,
    });
  }
};
