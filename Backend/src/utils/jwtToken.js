import jwt from "jsonwebtoken";

// Sign token
export const signToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
};

// Verify the token
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
