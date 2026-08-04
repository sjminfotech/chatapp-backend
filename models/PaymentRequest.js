const mongoose = require("mongoose");

const paymentRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PremiumUser",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    upiId: {
      type: String,
      required: true,
    },

    screenshot: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "PaymentRequest",
  paymentRequestSchema
);