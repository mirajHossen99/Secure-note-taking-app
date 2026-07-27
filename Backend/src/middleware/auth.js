import mongoose from "mongoose";
import User from "../models/User.js";
import { verifyToken } from "../utils/jwtToken.js";

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid Authorization header format",
      });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (!payload?.id || !mongoose.Types.ObjectId.isValid(payload.id)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload structure",
      });
    }

    const user = await User.findById(payload.id).select("-password").lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User for this token no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export default requireAuth;
