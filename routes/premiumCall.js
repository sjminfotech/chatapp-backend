const express = require("express");
const router = express.Router();
const PremiumCall = require("../models/PremiumCall");
const CoinWallet = require("../models/CoinWallet");
const PremiumUser = require("../models/PremiumUser");
const CoinTransaction = require("../models/CoinTransaction");
const WalletTransaction = require("../models/WalletTransaction");

router.post("/start-call", async (req, res) => {
    try {

        const { callerId, receiverId } = req.body;

        const wallet = await CoinWallet.findOne({ userId: callerId });

        if (!wallet || wallet.coins < 50) {
            return res.status(400).json({
                success: false,
                message: "Insufficient coins"
            });
        }

        const call = await PremiumCall.create({
            callerId,
            receiverId,
            callStatus: "started"
        });

        // ⏱️ LIVE TIMER START
        let minutes = 0;

        const interval = setInterval(async () => {
            try {

                const wallet = await CoinWallet.findOne({ userId: callerId });

                if (!wallet || wallet.coins < 50) {
                    clearInterval(interval);

                    await PremiumCall.findByIdAndUpdate(call._id, {
                        callStatus: "ended",
                        durationMinutes: minutes
                    });

                    return;
                }

                // Deduct coins
                wallet.coins -= 50;
                wallet.totalSpent += 50;
                await wallet.save();

                // Creator earning
                const creator = await PremiumUser.findById(receiverId);
                creator.walletBalance += 15;
                creator.totalEarnings += 15;
                await creator.save();

                minutes++;

                console.log(`Call Running: ${minutes} min`);

            } catch (err) {
                console.log(err);
            }

        }, 60000); // 1 minute

        res.json({
            success: true,
            message: "Call Started Live",
            callId: call._id
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.post("/end-call", async (req, res) => {
    try {

        const { callId, durationMinutes } = req.body;

        const call = await PremiumCall.findById(callId);

        if (!call) {
            return res.status(404).json({
                success: false,
                message: "Call not found"
            });
        }

        // Coin calculation
        const totalCoins = durationMinutes * 50;
        const creatorShare = durationMinutes * 15;
        const appShare = totalCoins - creatorShare;

        // Update call
        call.durationMinutes = durationMinutes;
        call.coinsCharged = totalCoins;
        call.creatorEarning = creatorShare;
        call.callStatus = "ended";
        await call.save();

        // Wallet deduction (caller)
        const wallet = await CoinWallet.findOne({ userId: call.callerId });

        wallet.coins -= totalCoins;
        wallet.totalSpent += totalCoins;
        await wallet.save();

        // Creator earning
        const creator = await PremiumUser.findById(call.receiverId);

        creator.walletBalance += creatorShare;
        creator.totalEarnings += creatorShare;
        await creator.save();

        // Transactions
        await CoinTransaction.create({
            userId: call.callerId,
            type: "call_deduction",
            coins: totalCoins,
            description: "Premium Call Charge"
        });

        await WalletTransaction.create({
            creatorId: call.receiverId,
            senderId: call.callerId,
            amount: creatorShare,
            type: "call_income",
            description: "Call Earnings"
        });

        res.json({
            success: true,
            message: "Call Ended",
            totalCoins,
            creatorShare,
            appShare
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