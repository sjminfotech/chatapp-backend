const express = require("express");
const router = express.Router();
const CoinWallet = require("../models/CoinWallet");
const PremiumCreator = require("../models/PremiumCreator");
const mongoose = require("mongoose");
const WalletTransaction = require("../models/WalletTransaction");
const CoinTransaction = require("../models/CoinTransaction");

router.post("/charge-message", async (req, res) => {
    try {

        const { senderId, creatorUserId } = req.body;

        const wallet = await CoinWallet.findOne({ userId: senderId });

        if (!wallet || wallet.coins < 10) {
            return res.status(400).json({
                success: false,
                message: "Insufficient Coins"
            });
        }

        const creator = await PremiumCreator.findOne({
            userId: creatorUserId,
            status: "approved"
        });

        if (!creator) {
            return res.status(404).json({
                success: false,
                message: "Creator Not Found"
            });
        }

        // Coin Deduction
        wallet.coins -= 10;
        wallet.totalSpent += 10;
        await wallet.save();

        // Creator Earnings
        creator.walletBalance += 3;
        creator.totalEarnings += 3;
        await creator.save();

        // Coin History
        await CoinTransaction.create({
            userId: senderId,
            type: "chat_deduction",
            coins: 10,
            description: "Premium Message Sent"
        });

        // Creator Income History
        await WalletTransaction.create({
            creatorId: creator._id,
            senderId,
            amount: 3,
            type: "chat_income",
            description: "Premium Chat Earning"
        });

        res.json({
            success: true,
            message: "10 Coins Deducted",
            remainingCoins: wallet.coins
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});


router.post("/check-access", async (req, res) => {
    try {

        const { senderId, creatorUserId } = req.body;

        const creator = await PremiumCreator.findOne({
            userId: creatorUserId,
            status: "approved",
            premiumChatEnabled: true
        });

        if (!creator) {
            return res.status(400).json({
                success: false,
                message: "Premium Chat Not Available"
            });
        }

        const wallet = await CoinWallet.findOne({
            userId: senderId
        });

        if (!wallet || wallet.coins < 10) {
            return res.status(400).json({
                success: false,
                message: "Insufficient Coins"
            });
        }

        res.json({
            success: true,
            message: "Premium Chat Allowed",
            creatorId: creator._id,
            availableCoins: wallet.coins
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.post("/apply", async (req, res) => {
    try {

        const { userId, fullName } = req.body;

        const existing = await PremiumCreator.findOne({ userId });
if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
        success: false,
        message: "Invalid User ID"
    });
}

        const creator = await PremiumCreator.create({
            userId,
            fullName
        });

        res.status(201).json({
            success: true,
            message: "Application Submitted",
            creator
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.put("/approve/:id", async (req, res) => {
    try {

        const creator = await PremiumCreator.findByIdAndUpdate(
            req.params.id,
            {
                status: "approved",
                premiumChatEnabled: true
            },
            { new: true }
        );

        if (!creator) {
            return res.status(404).json({
                success: false,
                message: "Creator Not Found"
            });
        }

        res.json({
            success: true,
            message: "Creator Approved",
            creator
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});


router.put("/reject/:id", async (req, res) => {
    try {

        const creator = await PremiumCreator.findByIdAndUpdate(
            req.params.id,
            {
                status: "rejected",
                premiumChatEnabled: false
            },
            { new: true }
        );

        if (!creator) {
            return res.status(404).json({
                success: false,
                message: "Creator Not Found"
            });
        }

        res.json({
            success: true,
            message: "Creator Rejected",
            creator
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

        const creators = await PremiumCreator.find({
            status: "pending"
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: creators.length,
            creators
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

        const creators = await PremiumCreator.find({
            status: "approved"
        });

        res.json({
            success: true,
            creators
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