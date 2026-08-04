const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumUser",
        required: true
      }
    ],

    // 🔥 TRACK MESSAGE FLOW (coin logic ke liye important)
    waitingReply: {
      type: Boolean,
      default: false
    },

    // last kisne message bheja
    lastSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PremiumUser",
      default: null
    },

    // last message text
    lastMessage: {
      type: String,
      default: ""
    },

    lastMessageAt: {
      type: Date,
      default: null
    },

    // unread / seen control (optional but useful)
    unreadCount: {
      type: Number,
      default: 0
    },

    // coin system state tracking (VERY IMPORTANT for your logic)
    coinLocked: {
      type: Boolean,
      default: false
    },

    // last message type tracking
    lastMessageType: {
      type: String,
      enum: ["text", "image", "video", "audio"],
      default: "text"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("PremiumConversation", conversationSchema);