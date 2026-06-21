const mongoose = require("mongoose");

const coinWalletSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    coins: {
        type: Number,
        default: 0
    },

    totalPurchased: {
        type: Number,
        default: 0
    },

    totalSpent: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
}
);

module.exports = mongoose.model(
    "CoinWallet",
    coinWalletSchema
);