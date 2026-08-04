const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
{
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumCreator",
        // required: true को हटा दिया क्योंकि admin_income में creatorId नहीं होगी
        required: false 
    },

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        // required: true को हटा दिया ताकि वैलीडेशन फेल न हो
        required: false 
    },

    amount: {
        type: Number,
        required: true
    },

    type: {
        type: String,
        enum: [
            "chat_income",
            "call_income",
            "withdrawal",
            "admin_income"
        ],
        required: true
    },

    description: {
        type: String,
        default: ""
    }
},
{
    timestamps: true
}
);

module.exports = mongoose.model(
    "WalletTransaction",
    walletTransactionSchema
);