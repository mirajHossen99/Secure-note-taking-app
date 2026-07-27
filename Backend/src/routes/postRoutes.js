import express from "express";
import {
  createPost,
  deletePost,
  getPostsForUser,
  listPosts,
} from "../controllers/postController.js";
import requireAuth from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listPosts);
router.get("/user/:userId", getPostsForUser);
router.post("/", createPost);
router.delete("/:id", deletePost);


export default router;
