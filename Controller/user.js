import { User } from "../Model/User.js";
import { userValidationSchema } from "../Model/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

//validation with zod
const validateUserData = (data) => {
  if (!data.email || !data.password) {
    return {
      valid: false,
      errors: [{ message: "Email and password are required" }],
    };
  }

  try {
    userValidationSchema.parse(data);
    return { valid: true, errors: null };
  } catch (error) {
    console.error("Validation error:", error);

    const formattedErrors = Array.isArray(error.errors)
      ? error.errors.map((err) => ({
          // field: err.path?.[0] || "unknown",
          message: err.message || "Validation error",
        }))
      : [{ message: "Unexpected validation error" }];

    return { valid: false, errors: formattedErrors };
  }
};

//user signup
export const signup = async (req, res) => {
  const { name, email, password, role } = req.body;
  // console.log(req.body);
  const { valid, errors } = validateUserData({
    name,
    email,
    password,
    role,
  });

  if (!valid) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  try {
    const existingUser = await User.findOne({ email }, { password: 0 });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });
    await user.save();
    res.status(200).json({
      message: `User registered successfully with ${user.name} & ${user.role}`,
      user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

//user login
export const login = async (req, res) => {
  const { email, password, role } = req.body;
  // console.log(req.body);
  const { valid, errors } = validateUserData({ email, password, role });

  if (!valid) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors,
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "$@#%^&*()~",
      { expiresIn: "2d" }
    );

    res.status(200).json({
      message: `Welcome ${user.name}`,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.log("Error while login", err);
  }
};
