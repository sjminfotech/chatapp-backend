const express = require("express");
const router = express.Router();
const CoinWallet = require("../models/CoinWallet");
const CoinTransaction = require("../models/CoinTransaction");
const PaymentRequest = require("../models/PaymentRequest");
const User = require("../models/User"); // ✨ भैया, यह इम्पोर्ट मिसिंग था, अब जोड़ दिया है!
const adminAuth = require("../middleware/adminAuth");

// 📤 1. Payment Request Upload Route
router.post("/upload", async (req, res) => {
    try {
        const { userId, screenshot, amount, upiId } = req.body;

        if (!screenshot) {
            return res.status(400).json({
                success: false,
                message: "Screenshot required"
            });
        }

        const newPayment = await PaymentRequest.create({
            userId,
            screenshot,
            amount: amount || 99, 
            upiId: upiId || "Not Provided"
        });

        res.status(201).json({
            success: true,
            message: "Payment Request Submitted",
            data: newPayment
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// ⏳ 2. Get Pending Payments
router.get("/pending", async (req, res) => {
    try {
        const requests = await PaymentRequest
            .find({ status: "pending" })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            total: requests.length,
            data: requests
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// ✅ 3. Approve Payment Request
router.post("/approve/:id", async (req, res) => {
    try {
        const payment = await PaymentRequest.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment request not found"
            });
        }

        if (payment.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Already processed"
            });
        }

        payment.status = "approved";
        await payment.save();

        let wallet = await CoinWallet.findOne({
            userId: payment.userId
        });

        if (!wallet) {
            wallet = await CoinWallet.create({
                userId: payment.userId,
                coins: 10000,
                totalPurchased: 10000,
                totalSpent: 0
            });
        } else {
            wallet.coins += 10000;
            wallet.totalPurchased += 10000;
            await wallet.save();
        }

        await CoinTransaction.create({
            userId: payment.userId,
            type: "purchase",
            coins: 10000,
            description: "UPI Payment Approved"
        });

        res.json({
            success: true,
            message: "Payment Approved & 10000 Coins Added"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// ❌ 4. Reject Payment Request
router.post("/reject/:id", async (req, res) => {
    try {
        const payment = await PaymentRequest.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment request not found"
            });
        }

        if (payment.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Already processed"
            });
        }

        payment.status = "rejected";
        await payment.save();

        res.json({
            success: true,
            message: "Payment Rejected"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// 📜 5. Get Approved Payments
router.get("/approved", async (req, res) => {
    try {
        const payments = await PaymentRequest
            .find({ status: "approved" })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            total: payments.length,
            data: payments
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

// 🗂️ 6. Get User Payment History
router.get("/history/:userId", async (req, res) => {
    try {
        const payments = await PaymentRequest
            .find({ userId: req.params.userId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            total: payments.length,
            data: payments
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});



module.exports = router;