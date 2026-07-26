import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { buildMeta, getPagination } from "../utils/pagination.js";

// Get users - Admin only
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [users, total] = await Promise.all([
    User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments({}),
  ]);

  res.json({
    success: true,
    users,
    meta: buildMeta({ page, limit, total }),
  });
});

// Create user - Admin only
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, interests } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required",
    });
  }

  const userEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: userEmail });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "A user with this email already exists",
    });
  }

  const user = await User.create({
    name,
    email: userEmail,
    password,
    interests: Array.isArray(interests) ? interests : [],
    role: role === "admin" ? "admin" : "user",
  });

  res.status(201).json({
    success: true,
    user,
  });
});

// Get user by id - Admin only
export const getUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    user,
  });
});

// Update user by id - Admin only
export const updateUser = asyncHandler(async (req, res) => {
  const { name, role, interests } = req.body;
  const userId = req.params.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (name !== undefined) user.name = name;
  if (Array.isArray(interests)) user.interests = interests;
  
  if (role !== undefined) {
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be "user" or "admin"',
      });
    }
    user.role = role;
  }

  await user.save();

  res.json({
    success: true,
    user,
  });
});

// Delete user by id - Admin only
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own admin account",
    });
  }

  await user.deleteOne();

  res.json({
    success: true,
    message: "User deleted successfully",
  });
});
