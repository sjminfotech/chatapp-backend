const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    media: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["image", "reel"],
      required: true,
    },

    caption: {
      type: String,
      default: "",
    },

    // ❤️ post likes
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 💬 comments
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },

        text: {
          type: String,
          required: true,
        },

        // ❤️ comment likes
        likes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],

        // ↩️ replies
        replies: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            text: {
              type: String,
              required: true,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Post", postSchema);