const mongoose = require("mongoose");

const premiumCallSchema = new mongoose.Schema({
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumUser",
        required: true
    },

    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumUser",
        required: true
    },

    durationMinutes: {
        type: Number,
        default: 0
    },

    coinsCharged: {
        type: Number,
        default: 0
    },

    creatorEarning: {
        type: Number,
        default: 0
    },

    callStatus: {
        type: String,
        enum: [
            "started",
            "ended",
            "missed"
        ],
        default: "started"
    }
},
{
    timestamps: true
});

module.exports = mongoose.model(
    "PremiumCall",
    premiumCallSchema
);