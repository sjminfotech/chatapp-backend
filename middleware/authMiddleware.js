const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = async (req, res, next) => {
  try {
    console.log("Authorization Header:", req.headers.authorization);

    const token = req.header("Authorization")?.replace("Bearer ", "");

    console.log("Extracted Token:", token);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);

    if (!token) {
      return res.status(401).json({
        message: "No token, authorization denied",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Decoded Token:", decoded);

    const userId = decoded.userId || decoded.id;

    req.user = await User.findById(userId).select("-password");

    console.log("User:", req.user);

    if (!req.user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    next();
  } catch (err) {
    console.error("JWT ERROR:", err);

    return res.status(401).json({
      success: false,
      name: err.name,
      message: err.message,
    });
  }
};

module.exports = authMiddleware;