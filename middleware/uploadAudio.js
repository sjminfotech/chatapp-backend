const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.replace("Bearer ", "");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("DECODED TOKEN:", decoded);

    // ✅ FIX HERE
   

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

   req.user = {
  _id: decoded.userId
};

    next();
  } catch (err) {
    console.log("AUTH ERROR:", err);
    return res.status(401).json({ message: "Auth failed" });
  }
};