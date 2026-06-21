const mongoose = require("mongoose");

const premiumConversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumUser"
    }],

    lastMessage: {
        type: String,
        default: ""
    },

    lastMessageAt: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "PremiumConversation",
    premiumConversationSchema
);