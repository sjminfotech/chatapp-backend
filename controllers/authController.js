const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// Import your Resend mailer function (Adjust path if needed)
const { sendEmail } = require("../config/resendMailer"); 

// OTP generate helper
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ================= SEND OTP =================
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    // Check if user exists before trying to send an OTP
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email" });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

    // Save OTP and Expiry to the User record
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send the email via Resend
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Password Reset OTP</h2>
        <p>You requested a password reset. Use the following One-Time Password (OTP) to proceed:</p>
        <h1 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h1>
        <p>This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: "Your Password Reset OTP",
      html: emailHtml,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully to your email.",
    });

  } catch (error) {
    console.error("Error in sendOTP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= VERIFY OTP =================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      !user.otp ||
      !user.otpExpiry ||
      user.otp !== otp ||
      user.otpExpiry < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    return res.json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear out OTP fields so they can't be reused
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= SIGNUP =================
exports.signup = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      phone,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const { password: _, otp, otpExpiry, ...safeUser } = user._doc;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};