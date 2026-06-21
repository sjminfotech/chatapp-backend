const mongoose = require("mongoose");

const coinTransactionSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

   type: {
  type: String,
  enum: [
    "purchase",
    "chat_deduction",
    "chat_income",
    "call_deduction",
    "refund",
    "admin_income"
  ],
  required: true
},

    coins: {
        type: Number,
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
    "CoinTransaction",
    coinTransactionSchema
);