const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

   sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // This is what triggered the error because it received 'undefined'
  },

    // Text message
    text: {
      type: String,
      default: "",
    },

    // Image URL (Cloudinary)
    image: {
      type: String,
      default: "",
    },

    // Audio URL (Cloudinary)
    audio: {
      type: String,
      default: "",
    },
    mediaUrl: {
      type: String,
      default: "",
    },

    // Video URL (Cloudinary)
    video: {
      type: String,
      default: "",
    },

    // Which media is sent
    mediaType: {
      type: String,
      enum: ["text", "image", "video", "audio"],
      default: "text",
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },

    seen: {
      type: Boolean,
      default: false,
    },

    seenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);