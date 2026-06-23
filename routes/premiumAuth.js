const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const PremiumUser = require("../models/PremiumUser");
const PremiumCreator = require("../models/PremiumCreator");
const CoinWallet = require("../models/CoinWallet");
const CoinTransaction = require("../models/CoinTransaction");
const jwt = require("jsonwebtoken");
const PremiumAuth = require("../middleware/premiumAuth");
const adminAuth = require("../middleware/adminAuth");
const auth = require("../middleware/auth");
const transporter = require("../config/mailer");
// पुराने इम्पॉर्ट्स को हटाकर इसे रखें:
const Resendmailer = require("../config/resendMailer");
const { sendEmail } = require("../config/resendMailer");
router.post("/signup", async (req, res) => {
    try {

        const {
            name,
            username,
            email,
            phone,
            password
        } = req.body;

        // Check Existing User
        const existingUser = await PremiumUser.findOne({
            $or: [
                { email },
                { username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Premium User
        const user = await PremiumUser.create({
            name,
            username,
            email,
            phone,
            password: hashedPassword
        });

        // Create Premium Creator Application
        const creator = await PremiumCreator.create({
            userId: user._id,
            fullName: name,
            status: "pending",
            premiumChatEnabled: false
        });

        // Give 1000 Free Coins
        await CoinWallet.create({
            userId: user._id,
            coins: 1000,
            totalPurchased: 1000,
            totalSpent: 0
        });

        // Save Transaction
        await CoinTransaction.create({
            userId: user._id,
            type: "purchase",
            coins: 1000,
            description: "Premium Creator Signup Bonus"
        });

        res.status(201).json({
            success: true,
            message: "Premium Creator Signup Successful",
            creatorStatus: "pending",
            freeCoins: 1000,
            creatorId: creator._id
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.post("/login", async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await PremiumUser.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const wallet = await CoinWallet.findOne({
            userId: user._id
        });

        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role
            },
            "SECRET_KEY",
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,

            user: {
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                status: user.status,
                role: user.role,
                coins: wallet?.coins || 0,
                walletBalance: user.walletBalance,
                totalEarnings: user.totalEarnings
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
});

router.get("/all-users", async(req,res)=>{

const users = await PremiumUser.find({
role:"buser"
}).select("-password");

res.json({
success:true,
users
});

});

router.post("/make-admin", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await PremiumUser.findOneAndUpdate(
      { email },
      { role: "admin" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      message: "Admin Created",
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

router.post("/create-buser", async (req, res) => {
  try {

    const bcrypt = require("bcryptjs");

    const {
      name,
      username,
      email,
      phone,
      password
    } = req.body;

    const existingUser = await PremiumUser.findOne({
      $or: [
        { email },
        { username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user = await PremiumUser.create({
      name,
      username,
      email,
      phone,
      password: hashedPassword,
      role: "buser",
      status: "approved"
    });

    res.status(201).json({
      success: true,
      message: "B User Created Successfully",
      user
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
});

router.get("/premium-users", async (req, res) => {
  try {
    const users = await PremiumUser.find({
      role: "premium"
    }).select("-password");

    res.json({
      success: true,
      users
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    // Single User
    if (type === "single") {
      const user = await PremiumUser
        .findById(id)
        .select("-password");

      return res.json({
        success: true,
        user
      });
    }

    // Chat User List
    const currentUser = await PremiumUser.findById(id);

    let users = [];

    if (currentUser.role === "user") {
      users = await PremiumUser.find({
        role: "buser"
      }).select("-password");
    } else {
      users = await PremiumUser.find({
        role: "user"
      }).select("-password");
    }

    return res.json({
      success: true,
      users
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await PremiumUser.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    await sendEmail({
      to: email,
      subject: "Premium OTP",
      html: `<h2>Your OTP is ${otp}</h2>`
    });

    res.json({
      success: true,
      message: "OTP Sent Successfully"
    });

  } catch (error) {
    console.log("OTP ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// Premium User Reset Password
router.post("/premium-reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    console.log("EMAIL:", email);
    console.log("OTP:", otp);

    const user = await PremiumUser.findOne({
      email,
      otp,
      otpExpire: { $gt: Date.now() },
    });

    console.log("USER FOUND:", user);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpire = null;

    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;