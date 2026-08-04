const express = require("express");
const router = express.Router();

const CoinWallet = require("../models/CoinWallet");
const CoinTransaction = require("../models/CoinTransaction");

router.post("/buy-pack", async (req, res) => {
    try {

        const { userId } = req.body;

        let wallet = await CoinWallet.findOne({ userId });

        if (!wallet) {
            wallet = await CoinWallet.create({
                userId,
                coins: 10000,
                totalPurchased: 10000
            });
        } else {
            wallet.coins += 10000;
            wallet.totalPurchased += 10000;

            await wallet.save();
        }

        // Transaction History Save
        await CoinTransaction.create({
            userId,
            type: "purchase",
            coins: 10000,
            description: "Premium Pack ₹99 Purchased"
        });

        res.json({
            success: true,
            message: "10000 Coins Added",
            wallet
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.get("/wallet/:userId", async (req, res) => {
    try {

        const wallet = await CoinWallet.findOne({
            userId: req.params.userId
        });

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet Not Found"
            });
        }

        res.json({
            success: true,
            wallet
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
}); 

router.get("/transactions/:userId", async (req, res) => {
    try {

        const { userId } = req.params;

        const transactions = await CoinTransaction
            .find({ userId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: transactions.length,
            transactions
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