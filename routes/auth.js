const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  sendOTP,
  verifyOTP,
  resetPassword,
} = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

module.exports = router;