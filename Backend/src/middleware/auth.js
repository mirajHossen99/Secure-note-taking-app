import User from "../models/User.js";
import { verifyToken } from "../utils/jwtToken.js";

const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Missing Authorization header",
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

    const user = await User.findById(payload.id).select("-password");

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
