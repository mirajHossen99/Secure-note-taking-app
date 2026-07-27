import mongoose from "mongoose";
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

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

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

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (name !== undefined) user.name = name;
  if (Array.isArray(interests)) user.interests = interests;

  if (role !== undefined) {
    if (!["user", "admin"].includes(role)) {
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
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const isOwner = user._id.toString() === req.user._id.toString();
  
  if (isOwner) {
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

// Get users grouped-by-interest - Admin only
// Solution: 1 [ Best solution for DRY ]
export const groupUsersByInterest = asyncHandler(async (req, res) => {
  const { interest } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const interestArray = interest
    ? (Array.isArray(interest) ? interest : interest.split(","))
        .map((i) => String(i).toLowerCase().trim())
        .filter(Boolean)
    : [];

  const matchStage = interestArray.length
    ? [{ $match: { interests: { $in: interestArray } } }]
    : [];

  const pipeline = [
    ...matchStage,
    { $unwind: "$interests" },
    ...matchStage,
    {
      $group: {
        _id: "$interests",
        count: { $sum: 1 },
        users: { $push: { _id: "$_id", name: "$name", email: "$email" } },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        interest: "$_id",
        count: 1,
        users: { $slice: ["$users", 20] },
      },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ];

  const [result] = await User.aggregate(pipeline, { allowDiskUse: true });
  const total = result?.metadata?.[0]?.total || 0;
  const groups = result?.data || [];

  res.json({
    success: true,
    groups,
    meta: buildMeta({ page, limit, total }),
  });
});

// --------------------- Optional (only for checking) -------------------------
// Get users grouped-by-interest - Admin only
// Solution: 2
export const groupUsersByInterest2 = asyncHandler(async (req, res) => {
  const { interest } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  let interestArray = [];

  if (interest) {
    if (typeof interest === "string") {
      interestArray = interest
        .split(",")
        .map((i) => i.toLowerCase().trim())
        .filter(Boolean);
    } else if (Array.isArray(interest)) {
      interestArray = interest
        .map((i) => String(i).toLowerCase().trim())
        .filter(Boolean);
    }
  }

  const pipeline = [];

  if (interestArray.length > 0) {
    pipeline.push({ $match: { interests: { $in: interestArray } } });
  }

  pipeline.push({ $unwind: "$interests" });

  if (interestArray.length > 0) {
    pipeline.push({ $match: { interests: { $in: interestArray } } });
  }

  pipeline.push(
    {
      $group: {
        _id: "$interests",
        count: { $sum: 1 },
        users: {
          $push: { _id: "$_id", name: "$name", email: "$email" },
        },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        interest: "$_id",
        count: 1,
        users: { $slice: ["$users", 20] },
      },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  );

  const [result] = await User.aggregate(pipeline, { allowDiskUse: true });

  const total = result?.metadata?.[0]?.total || 0;
  const groups = result?.data || [];

  res.json({
    success: true,
    groups,
    meta: buildMeta({ page, limit, total }),
  });
});
