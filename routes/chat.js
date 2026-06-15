const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const Conversation = require("../models/Conversation");

router.post("/", auth, async (req, res) => {
  try {
    const { receiverId } = req.body;

    let conversation =
      await Conversation.findOne({
        members: {
          $all: [
            req.user.userId,
            receiverId,
          ],
        },
      });

    if (!conversation) {
      conversation =
        await Conversation.create({
          members: [
            req.user.userId,
            receiverId,
          ],
        });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const conversations =
      await Conversation.find({
        members: req.user.userId,
      }).populate(
        "members",
        "name image"
      );

    res.json(conversations);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;