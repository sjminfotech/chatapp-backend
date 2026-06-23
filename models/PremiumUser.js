const mongoose = require("mongoose");

const premiumUserSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true
    },

    username: {
        type: String,
        required: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    phone: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

role: {
  type: String,
  enum: ["user", "buser", "admin"],
  default: "user"
},


otp: { type: String },
otpExpire: { type: Date },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    coins: {
        type: Number,
        default: 1000
    },

   walletBalance: {
   type: Number,
   default: 0
},
isBanned: {
    type: Boolean,
    default: false
},

    totalEarnings: {
        type: Number,
        default: 0
    }
},

{
    timestamps: true
}
);

module.exports = mongoose.model(
    "PremiumUser",
    premiumUserSchema
);