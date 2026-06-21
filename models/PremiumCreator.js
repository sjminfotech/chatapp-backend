const mongoose = require("mongoose");

const premiumCreatorSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    fullName: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    premiumChatEnabled: {
        type: Boolean,
        default: false
    },

    totalEarnings: {
        type: Number,
        default: 0
    },

    walletBalance: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
}
);

module.exports = mongoose.model(
    "PremiumCreator",
    premiumCreatorSchema
);