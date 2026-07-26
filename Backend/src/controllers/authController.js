import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwtToken.js";

// register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, interests } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "name, email and password are required" });
  }

  if (String(password).length < 6) {
    return res
      .status(400)
      .json({ message: "password must be at least 6 characters" });
  }

  // Check user already exists
  const existing = await User.findOne({ email: String(email).toLowerCase() });

  if (existing) {
    return res
      .status(409)
      .json({ message: "A user with this email already exists" });
  }

  const user = await User.create({
    name,
    email,
    password,
    interests,
    role: "user",
  });

  const token = signToken(user);
  res.status(201).json({ token, user });
});

// login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  // Check user exists
  const user = await User.findOne({
    email: String(email).toLowerCase(),
  }).select("+password -interests");

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check password
  const match = await user.comparePassword(password);

  if (!match) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user);
  res.status(200).json({ token, user });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});
