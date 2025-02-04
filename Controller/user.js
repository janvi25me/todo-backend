import { User } from "../Model/User.js";
import { validateUserData } from "../Model/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

//validation with zod
const userValidation = ({ email, password }) => {
  const errors = {};
  let valid = true;

  if (!email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    errors.email = "Invalid email";
    valid = false;
  }

  if (!password || password.length < 6) {
    errors.password = "Password must be at least 6 characters";
    valid = false;
  }

  // if (!role || (role !== "buyer" && role !== "seller")) {
  //   errors.role = "Role must be either 'buyer' or 'seller'";
  //   valid = false;
  // }

  return { valid, errors };
};

//user signup
export const signup = async (req, res) => {
  try {
    // Parse and validate the input
    const parsed = validateUserData.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      console.error("Validation errors:", errors);
      return res.status(400).json({ errors });
    }

    const {
      email,
      password,
      role,
      firstName,
      middleName,
      lastName,
      shopName,
      contact,
      image,
    } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error("User already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance
    const newUser = new User({
      email,
      password: hashedPassword,
      role,
      firstName,
      middleName,
      lastName,
      shopName: role === "2" ? shopName : undefined,
      contact,
      image: req.file ? req.file.path.replace(/\\/g, "/") : "",
    });

    console.log("Image Path:", newUser.image);

    // Save the new user to the database
    await newUser.save();

    res.status(200).json({
      message: "User created successfully",
      user: {
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        middleName: newUser.middleName,
        lastName: newUser.lastName,
        contact: newUser.contact,
        shopName: newUser.shopName,
        image: newUser.image,
      },
    });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//user login
export const login = async (req, res) => {
  const { email, password, role } = req.body;
  // console.log(req.body);
  const { valid, errors } = userValidation({ email, password, role });

  if (!valid) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors,
    });
  }

  try {
    const user = await User.findOne({ email });
    // console.log("!", user.firstName);
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
      message: `Welcome ${user.firstName}`,

      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        token: token,
      },
      token,
    });
    // console.log(user);
  } catch (err) {
    console.log("Error while login", err);
  }
};

export const profile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // console.log("userId", userId);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.file) {
      user.image = req.file.path;
    }

    // console.log("Image", user.image);
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;

    await user.save();

    // console.log("Image", user.image);

    res.status(200).json({
      email: user.email,
      image: user.image,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      image: user.image,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};
