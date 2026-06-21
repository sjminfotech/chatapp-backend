const mongoose = require("mongoose");

const premiumMessageSchema = new mongoose.Schema({
    
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumConversation",
        required: true
    },

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumUser",
        required: true
    },

    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumUser",
        required: true
    },

    message: {
        type: String,
        required: true
    },

    coinsCharged: {
        type: Number,
        default: 10
    },

    messageType: {
        type: String,
        default: "text"
    },

    seen: {
        type: Boolean,
        default: false
    },

    seenAt: {
        type: Date
    },

    profilePhoto: {
        type: String,
        default: ""
    },

    audio: {
        type: String,
        default: ""
    },

    image: {
        type: String,
        default: ""
    },

    video: {
        type: String,
        default: ""
    },

    waitingReply: {
        type: Boolean,
        default: false
    },

    lastSender: {
        type: String,
        default: ""
    },
isPaid: { type: Boolean, default: false },
    delivered: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "PremiumMessage",
    premiumMessageSchema
);