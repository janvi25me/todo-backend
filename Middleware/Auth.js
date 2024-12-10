import jwt from "jsonwebtoken";
import { User } from "../Model/User";

export const Authenticated = async (req, res, next) => {
  const token = req.header("Auth");

  if (!token) return res.json({ message: "Login first" });

  try {
    const decoded = jwt.verify(token, "$@#%^&*()~");

    const id = decoded.userId;
    let user = await User.findById(id);

    if (!user) return res.json({ message: "User not exist" });

    req.user = user?._id && user;
    console.log("From Middleware", req.user);

    next();
  } catch (error) {
    console.error("Error in Authenticated middleware:", error);
    res.status(401).json({ message: "Unauthorized", error: error.message });
  }
};
