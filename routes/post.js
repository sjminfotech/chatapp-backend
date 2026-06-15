const express = require("express");
const router = express.Router();

const Post = require("../models/Post");
const User = require("../models/User");

const auth = require("../middleware/auth");
const uploadMedia = require("../middleware/uploadMedia");
// 🔥 ADD MULTER HERE
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* =========================
   CREATE POST
========================= */

/* ==============================================
   1. CREATE POST (Using Your Existing Cloudinary Middleware)
   ============================================== */
router.post(
  "/create",
  auth,
  uploadMedia.single("image"), // Frontend FormData ki key 'image' honi chahiye
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // 🔥 Aapka middleware Cloudinary URL ko 'req.file.path' mein deta hai
      const cloudinaryMediaUrl = req.file.path; 

      const post = await Post.create({
        user: req.user.userId,   
        media: cloudinaryMediaUrl, // Direct Cloudinary link DB mein save hoga
        caption: req.body.caption,
        type: req.file.mimetype.startsWith("video") ? "video" : "image",
      });

      res.json({ post });

    } catch (err) {
      console.log("CREATE ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// DELETE POST API: /api/post/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   MY POSTS
========================= */

router.get("/my-posts", auth, async (req, res) => {
  try {
    const posts = await Post.find({
      user: req.user.userId,
    })
      .populate("user", "username name image")
      .populate("likes", "username name image")
      .populate("comments.user", "username name image")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

/* =========================
   FOLLOWERS ONLY FEED
========================= */



/* =========================
   LIKE POST
========================= */

router.post("/like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(
      req.params.id
    );

    if (!post)
      return res.status(404).json({
        message: "Post not found",
      });

    if (
      !post.likes.includes(req.user.userId)
    ) {
      post.likes.push(req.user.userId);
      await post.save();
    }

    res.json({
      success: true,
      likes: post.likes.length,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

/* =========================
   UNLIKE POST
========================= */

router.post(
  "/unlike/:id",
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(
        req.params.id
      );

      if (!post)
        return res.status(404).json({
          message: "Post not found",
        });

      post.likes = post.likes.filter(
        (id) =>
          id.toString() !==
          req.user.userId
      );

      await post.save();

      res.json({
        success: true,
        likes: post.likes.length,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

/* =========================
   DELETE POST
========================= */

router.delete(
  "/delete/:id",
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(
        req.params.id
      );

      if (!post)
        return res.status(404).json({
          message: "Post not found",
        });

      if (
        post.user.toString() !==
        req.user.userId
      ) {
        return res.status(403).json({
          message: "Unauthorized",
        });
      }

      await Post.findByIdAndDelete(
        req.params.id
      );

      await User.findByIdAndUpdate(
        req.user.userId,
        {
          $pull: {
            posts: req.params.id,
          },
        }
      );

      res.json({
        success: true,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({
      user: req.params.userId,
    })
      .populate("user")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
    });
  }
});


// ❤️ LIKE COMMENT
router.put(
  "/comment/like/:postId/:commentId",
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comment = post.comments.id(req.params.commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // TOGGLE LIKE
      const index = comment.likes.indexOf(req.user.id);

      if (index === -1) {
        comment.likes.push(req.user.id);
      } else {
        comment.likes.splice(index, 1);
      }

      await post.save();
      res.json(comment.likes);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  }
);

/* =========================
   ADD COMMENT
========================= */

/* =========================
   ADD COMMENT (FIXED)
========================= */

router.post("/comment/:id", auth, async (req, res) => {
  try {
    const { text } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    // 1. Comment ko array me push kiya
    post.comments.push({
      user: req.user.userId,
      text,
    });

    // 2. Database me save kiya
    await post.save();

    // 🔥 FIX: Database se dubara fresh post nikali aur 'comments.user' ko image ke sath populate kiya
    const updatedPost = await Post.findById(post._id)
      .populate("user", "username name image")
      .populate("likes", "username name image")
      .populate("comments.user", "username name image"); // Yeh line user ki image nikalegi

    // 3. Ab populated data frontend ko bhejo
    res.json(updatedPost);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});
/* =========================
   DELETE COMMENT
========================= */

router.delete(
  "/comment/:postId/:commentId",
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(
        req.params.postId
      );

      if (!post) {
        return res.status(404).json({
          message: "Post not found",
        });
      }

      const comment = post.comments.id(
        req.params.commentId
      );

      if (!comment) {
        return res.status(404).json({
          message: "Comment not found",
        });
      }

      if (
        comment.user.toString() !==
        req.user.userId
      ) {
        return res.status(403).json({
          message: "Unauthorized",
        });
      }

      comment.deleteOne();

      await post.save();

      res.json({
        success: true,
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get("/feed", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username name image")
      .populate("likes", "username name image")
      .populate("comments.user", "username name image")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ==============================================
   2. UPDATE PROFILE PIC (Using Your Existing Cloudinary Middleware)
   ============================================== */
router.put(
  "/update-profile-pic",
  auth,
  uploadMedia.single("profilePic"), // Frontend FormData ki key 'profilePic' honi chahiye
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;

      if (!req.file) {
        return res.status(400).json({ message: "No profile picture uploaded" });
      }

      const cloudinaryProfileUrl = req.file.path; // Cloudinary secure URL

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { image: cloudinaryProfileUrl }, // User model mein 'image' field update hogi
        { new: true }
      ).select("-password");

      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.log("PROFILE PIC UPDATE ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);
module.exports = router;  