exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // 🔥 CORRECT COMMENT PUSH
    post.comments.push({
      user: req.user.id,   // ❗ MUST
      text: req.body.text // ❗ MUST
    });

    await post.save();


exports.getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id })
      .populate("user", "username name image")
      .populate("likes", "username name image")
      .populate("comments.user", "username name image")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getAllPosts = async (req, res) => {
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
};

    // 🔥 FULL POPULATE AFTER SAVE
    const updatedPost = await Post.findById(post._id)
      .populate("user", "username name image")
      .populate("likes", "username name image")
      .populate("comments.user", "username name image");

    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};