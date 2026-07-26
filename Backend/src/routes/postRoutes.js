import express from "express";
import {
  createPost,
  getPostsForUser,
  listPosts,
} from "../controllers/postController.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();

router.get("/", listPosts);
router.get("/user/:userId", getPostsForUser);
router.post("/", requireAuth, createPost);

export default router;
