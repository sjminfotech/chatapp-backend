const express = require("express");
const router = express.Router();

const adminAuth = require("../middleware/adminAuth");

// ================= MODELS =================
const PremiumUser = require("../models/PremiumUser");
const PaymentRequest = require("../models/PaymentRequest");
const CoinWallet = require("../models/CoinWallet");
const PremiumCreator = require("../models/PremiumCreator");
const WithdrawRequest = require("../models/WithdrawRequest");

// ================= DASHBOARD STATS =================
router.get("/dashboard", adminAuth, async (req, res) => {
    try {
        const totalUsers = await PremiumUser.countDocuments();

        const pendingPayments = await PaymentRequest.countDocuments({
            status: "pending"
        });

        const approvedPayments = await PaymentRequest.countDocuments({
            status: "approved"
        });

        const wallets = await CoinWallet.find();
        let totalCoinsSold = 0;
        wallets.forEach((wallet) => {
            totalCoinsSold += wallet.totalPurchased || 0;
        });

        const totalRevenue = approvedPayments * 99;

        const creators = await PremiumUser.find();
        let totalCreatorEarnings = 0;
        creators.forEach((user) => {
            totalCreatorEarnings += user.totalEarnings || 0;
        });

        res.json({
            success: true,
            dashboard: {
                totalUsers,
                pendingPayments,
                approvedPayments,
                totalCoinsSold,
                totalRevenue,
                totalCreatorEarnings
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

// ================= GET ALL USERS =================
router.get("/users", adminAuth, async (req, res) => {
    try {
        const users = await PremiumUser.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            total: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// ================= CREATORS LOGIC =================
router.get("/creators", adminAuth, async (req, res) => {
    try {
        const creators = await PremiumCreator.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            total: creators.length,
            data: creators
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.post("/creator/approve/:id", adminAuth, async (req, res) => {
    try {
        const creator = await PremiumCreator.findById(req.params.id);
        if (!creator) {
            return res.status(404).json({ success: false, message: "Creator not found" });
        }
        creator.status = "approved";
        creator.premiumChatEnabled = true;
        await creator.save();

        res.json({ success: true, message: "Creator Approved" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.post("/creator/reject/:id", adminAuth, async (req, res) => {
    try {
        const creator = await PremiumCreator.findById(req.params.id);
        if (!creator) {
            return res.status(404).json({ success: false, message: "Creator not found" });
        }
        creator.status = "rejected";
        await creator.save();

        res.json({ success: true, message: "Creator Rejected" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ================= 🔥 USER BAN/UNBAN LOGIC (FIXED) =================

// 🔒 1. यूज़र को BLOCK करने का राउट (PremiumUser मॉडल का उपयोग करके)
router.post("/ban-user/:id", adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const updatedUser = await PremiumUser.findByIdAndUpdate(
      userId, 
      { isBanned: true }, 
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "यूज़र नहीं मिला!" });
    }

    res.json({ success: true, message: "यूज़र को ब्लॉक कर दिया गया है!", data: updatedUser });
  } catch (err) {
    console.error("Backend Ban Error:", err);
    res.status(500).json({ success: false, message: "सर्वर एरर आया", error: err.message });
  }
});

// 🔓 2. यूज़र को UNBLOCK करने का राउट
router.post("/unban-user/:id", adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    const updatedUser = await PremiumUser.findByIdAndUpdate(
      userId, 
      { isBanned: false }, 
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "यूज़र नहीं मिला!" });
    }

    res.json({ success: true, message: "यूज़र को अनब्लॉक कर दिया गया है!", data: updatedUser });
  } catch (err) {
    console.error("Backend Unban Error:", err);
    res.status(500).json({ success: false, message: "सर्वर एरर आया", error: err.message });
  }
});


// ================= WITHDRAW LOGIC =================
router.get("/withdraws", adminAuth, async (req, res) => {
    try {
        const requests = await WithdrawRequest.find({ status: "pending" });
        res.json({
            success: true,
            total: requests.length,
            data: requests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.post("/withdraw/approve/:id", adminAuth, async (req, res) => {
    try {
        const request = await WithdrawRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        const creator = await PremiumUser.findById(request.creatorId);
        if (!creator) {
            return res.status(404).json({ success: false, message: "Creator not found" });
        }

        // Coins → Rupees Conversion
        const rupees = (request.amount * 99) / 10000;
        creator.walletBalance -= request.amount;
        await creator.save();

        request.status = "approved";
        await request.save();

        res.json({
            success: true,
            message: "Withdraw Approved",
            coinsDeducted: request.amount,
            amountToPay: rupees
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

router.post("/withdraw/reject/:id", adminAuth, async (req, res) => {
    try {
        const request = await WithdrawRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        request.status = "rejected";
        await request.save();

        res.json({ success: true, message: "Withdraw Rejected" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;