const express = require("express");
const router = express.Router();
const CoinWallet = require("../models/CoinWallet");
const CoinTransaction = require("../models/CoinTransaction");
const PaymentRequest = require("../models/PaymentRequest");
const adminAuth = require("../middleware/adminAuth");

router.post("/upload", async (req, res) => {
    try {

        const { userId, screenshot } = req.body;

        if (!screenshot) {
            return res.status(400).json({
                success: false,
                message: "Screenshot required"
            });
        }

        const payment = await PaymentRequest.create({
            userId,
            screenshot
        });

        res.status(201).json({
            success: true,
            message: "Payment Request Submitted",
            data: payment
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

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

        // Update payment status
        payment.status = "approved";
        await payment.save();

        // Find wallet
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

        // Transaction entry
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

router.get("/history/:userId", async (req, res) => {
    try {

        const payments = await PaymentRequest
            .find({
                userId: req.params.userId
            })
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