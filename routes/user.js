const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const auth = require("../middleware/auth");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMedia");

router.get("/profile", auth, (req, res) => {
  res.json({
    message: "Protected Route",
    user: req.user
  });
});

// ✅ ME ROUTE — hamesha dynamic route se upar
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.status(200).json(user);
  } catch (err) {
    console.log("ME API ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= BLOCK / UNBLOCK USER =================
router.put("/block/:id", auth, async (req, res) => {
  try {
    // 💡 FIXED: req.user.userId use kiya jo aapka auth middleware provide karta hai
    const loggedInUserId = req.user.userId; 
    const targetUserId = req.params.id;

    if (!loggedInUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (loggedInUserId.toString() === targetUserId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot block yourself" });
    }

    const user = await User.findById(loggedInUserId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ safety
    if (!Array.isArray(user.blockedUsers)) {
      user.blockedUsers = [];
    }

    // remove null / undefined
    user.blockedUsers = user.blockedUsers.filter(Boolean);

    const alreadyBlocked = user.blockedUsers.some(
      (id) => id.toString() === targetUserId.toString()
    );

    if (alreadyBlocked) {
      // UNBLOCK
      user.blockedUsers = user.blockedUsers.filter(
        (id) => id.toString() !== targetUserId.toString()
      );
      await user.save();
      return res.json({ message: "User unblocked" });
    } else {
      // BLOCK
      user.blockedUsers.push(targetUserId);
      await user.save();
      return res.json({ message: "User blocked" });
    }
  } catch (error) {
    console.error("BLOCK API ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// 👇 ALL USERS API
router.get("/users", auth, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("followers", "_id")
      .populate("following", "_id")
      .populate("followRequestsReceived", "_id")
      .populate("followRequestsSent", "_id")
      .populate("posts");

    res.json(users);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.get("/feed", auth, async (req, res) => {
  try {
    const posts = await Post.find().populate("user");

    const visiblePosts = posts.filter(
      (post) =>
        post.user.followers.some(
          (id) => id.toString() === req.user.userId
        ) ||
        post.user._id.toString() === req.user.userId
    );

    res.json(visiblePosts);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// ✅ SEARCH USER (ALWAYS ABOVE /:id)
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Query required" });
    }

    const regex = new RegExp(query, "i");

    const users = await User.find({
      $or: [
        { name: regex },
        { username: regex }
      ]
    }).select("name username email");

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/send-follow-request/:id", auth, async (req, res) => {
  try {
    const sender = await User.findById(req.user.userId);
    const receiver = await User.findById(req.params.id);

    if (!receiver)
      return res.status(404).json({ message: "User not found" });

    if (!receiver.followRequestsReceived.includes(sender._id)) {
      receiver.followRequestsReceived.push(sender._id);
      sender.followRequestsSent.push(receiver._id);

      await receiver.save();
      await sender.save();
    }

    res.json({
      success: true,
      message: "Follow request sent",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/follow-requests", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate("followRequestsReceived", "name image email");

    res.json(user.followRequestsReceived);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/accept-request/:id", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const sender = await User.findById(req.params.id);

    if (!currentUser || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!currentUser.followers.includes(sender._id)) {
      currentUser.followers.push(sender._id);
    }

    if (!sender.following.includes(currentUser._id)) {
      sender.following.push(currentUser._id);
    }

    currentUser.followRequestsReceived = currentUser.followRequestsReceived.filter(
      (id) => id.toString() !== sender._id.toString()
    );

    sender.followRequestsSent = sender.followRequestsSent.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    await currentUser.save();
    await sender.save();

    res.json({
      success: true,
      message: "Request accepted",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// POST /api/follow/unfollow/:id
router.post("/unfollow/:id", auth, async (req, res) => {
  try {
    // 💡 FIXED: Yahan bhi req.user._id galat tha, req.user.userId kiya hai
    const myId = req.user.userId; 
    const targetId = req.params.id;

    await User.findByIdAndUpdate(myId, {
      $pull: { following: targetId }
    });

    await User.findByIdAndUpdate(targetId, {
      $pull: { followers: myId }
    });

    res.json({ success: true });
  } catch (err) {
    console.log("UNFOLLOW ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// FOLLOW USER
router.post("/follow/:id", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    if (!currentUser.following.includes(targetUser._id)) {
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);

      await currentUser.save();
      await targetUser.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 👇 UPDATE PROFILE (MongoDB only)
router.put("/update-profile", auth, async (req, res) => {
  try {
    const { name, email, image, bio, gender } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { name, email, image, bio, gender },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message,
    });
  }
});

// 💡 NOTE: Ye route sabse neeche hi rehna chahiye, nahi toh baaki APIs block ho sakti hain
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server Error",
    });
  }
});

// SEND OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const otp = crypto.randomInt(100000, 999999).toString();

  user.otp = otp;
  user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 min
  await user.save();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset OTP",
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
  });

  res.json({ message: "OTP sent to email" });
});


router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    otp,
    otpExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  res.json({ message: "OTP verified" });
});
const bcrypt = require("bcryptjs");

router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;
  user.otp = undefined;
  user.otpExpire = undefined;

  await user.save();

  res.json({ message: "Password updated successfully" });
});


router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({
      user: req.params.userId,
    })
      .populate("user", "name image")
      .populate("comments.user", "name image")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.post(
  "/upload",
  auth,
  upload.single("media"),
  async (req, res) => {
    try {
      res.json({
        url: req.file.path, // Cloudinary URL
      });
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

module.exports = router;