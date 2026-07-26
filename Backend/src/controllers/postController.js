import mongoose from "mongoose";
import Post from "../models/Post.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getPagination, buildMeta } from "../utils/pagination.js";

// Create post
export const createPost = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  if (!title) {
    return res
      .status(400)
      .json({ success: false, message: "Title is required" });
  }

  const post = await Post.create({
    title,
    content,
    author: req.user._id,
  });

  res.status(201).json({ success: true, post });
});

// Get list posts
export const listPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [posts, total] = await Promise.all([
    Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name email")
      .lean(),
    Post.countDocuments({}),
  ]);

  res.json({
    success: true,
    posts,
    meta: buildMeta({ page, limit, total }),
  });
});

export const getPostsForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit, skip } = getPagination(req.query);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [result] = await User.aggregate([
    { $match: { _id: userObjectId } },
    {
      $lookup: {
        from: "posts",
        let: { userId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$author", "$$userId"] } } },
          { $sort: { createdAt: -1 } },
          {
            $facet: {
              metadata: [{ $count: "total" }],
              data: [{ $skip: skip }, { $limit: limit }],
            },
          },
        ],
        as: "postsData",
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        posts: { $arrayElemAt: ["$postsData.data", 0] },
        totalPosts: {
          $ifNull: [{ $arrayElemAt: ["$postsData.metadata.total", 0] }, 0],
        },
      },
    },
  ]);

  if (!result) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const { posts, totalPosts: total } = result;

  res.json({
    success: true,
    user: { _id: result._id, name: result.name, email: result.email },
    posts: posts || [],
    meta: buildMeta({ page, limit, total }),
  });
});
