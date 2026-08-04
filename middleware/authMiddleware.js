const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🔍 Debugging Logs:
    console.log("Decoded Token Data:", decoded);

    const userId = decoded.userId || decoded.id;
    console.log("Extracted User ID:", userId);

    req.user = await User.findById(userId).select("-password");
    console.log("User found in DB:", req.user ? req.user._id : "NOT FOUND");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};