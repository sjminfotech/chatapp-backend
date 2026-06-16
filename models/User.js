const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

  otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
      image: {
    type: String,
    default: "",
  },
  bio: {
  type: String,
  default: "",
},
  username: {
    type: String,
    unique: true,
    sparse: true, // username optional
  },

gender: {
  type: String,
  default: "",
},
followers: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],

following: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],

followRequestsSent: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],

followRequestsReceived: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],
  blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
posts: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
],
    otpExpiry: {
      type: Date,
      default: null,
    }
  },
  
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);