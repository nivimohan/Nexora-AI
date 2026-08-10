import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Auth Middleware
// Verifies the Bearer JWT in the Authorization header and attaches
// the decoded user object to req.user for downstream route handlers.
// ─────────────────────────────────────────────────────────────────────────────

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorised — no token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User belonging to this token no longer exists.",
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Not authorised — invalid or expired token.",
    });
  }
};
