const mongoose = require("mongoose");

const withdrawRequestSchema = new mongoose.Schema(
{
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PremiumUser",
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    upiId: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    }
},
{
    timestamps: true
}
);

module.exports = mongoose.model(
    "WithdrawRequest",
    withdrawRequestSchema
);