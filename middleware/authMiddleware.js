const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    // Authorization Header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Token Extract
    const token = authHeader.split(" ")[1];

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("========== JWT DEBUG ==========");
    console.log("Decoded Token:", decoded);

    // User ID Extract
    const userId =
      decoded._id ||
      decoded.id ||
      decoded.userId ||
      decoded.user?._id;

    console.log("User ID From Token:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID missing in token",
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Invalid ObjectId:", userId);

      return res.status(401).json({
        success: false,
        message: "Invalid User ID",
      });
    }

console.log("DB Name:", mongoose.connection.name);
console.log("Collection:", User.collection.name);

const count = await User.countDocuments();
console.log("Total Users:", count);

const users = await User.find().select("_id name email");
console.log(users);

    // Find User
    const user = await User.findById(userId).select("-password");

    console.log("User Found:", user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found in Database",
      });
    }

    req.user = user;

    console.log("Authenticated:", user.name);

    next();

  } catch (error) {
    console.log("========== AUTH ERROR ==========");
    console.log(error);

    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
};

module.exports = authMiddleware;