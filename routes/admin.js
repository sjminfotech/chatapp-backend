const express = require("express");
const router = express.Router();

const adminAuth = require("../middleware/adminAuth");

const PremiumUser = require("../models/PremiumUser");
const PaymentRequest = require("../models/PaymentRequest");
const CoinWallet = require("../models/CoinWallet");

router.get("/dashboard", adminAuth, async (req, res) => {
    try {

        const totalUsers = await PremiumUser.countDocuments();

        const pendingPayments =
            await PaymentRequest.countDocuments({
                status: "pending"
            });

        const approvedPayments =
            await PaymentRequest.countDocuments({
                status: "approved"
            });

        const wallets = await CoinWallet.find();

        let totalCoinsSold = 0;

        wallets.forEach((wallet) => {
            totalCoinsSold += wallet.totalPurchased || 0;
        });

        const totalRevenue =
            approvedPayments * 99;

        const creators = await PremiumUser.find();

        let totalCreatorEarnings = 0;

        creators.forEach((user) => {
            totalCreatorEarnings +=
                user.totalEarnings || 0;
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

router.get("/users", adminAuth, async (req, res) => {
    try {

        const users = await PremiumUser
            .find()
            .sort({ createdAt: -1 });

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

const PremiumCreator =
require("../models/PremiumCreator");

router.get("/creators", adminAuth, async (req, res) => {

    const creators =
    await PremiumCreator.find()
    .sort({ createdAt: -1 });

    res.json({
        success: true,
        total: creators.length,
        data: creators
    });

});

router.post(
"/creator/approve/:id",
adminAuth,
async (req, res) => {

    const creator =
    await PremiumCreator.findById(req.params.id);

    if (!creator) {
        return res.status(404).json({
            success:false,
            message:"Creator not found"
        });
    }

    creator.status = "approved";
    creator.premiumChatEnabled = true;

    await creator.save();

    res.json({
        success:true,
        message:"Creator Approved"
    });

});

router.post(
"/creator/reject/:id",
adminAuth,
async (req, res) => {

    const creator =
    await PremiumCreator.findById(req.params.id);

    if (!creator) {
        return res.status(404).json({
            success:false,
            message:"Creator not found"
        });
    }

    creator.status = "rejected";

    await creator.save();

    res.json({
        success:true,
        message:"Creator Rejected"
    });

});

router.post(
"/ban-user/:id",
adminAuth,
async (req, res) => {

    const user =
    await PremiumUser.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success:false,
            message:"User not found"
        });
    }

    user.isBanned = true;

    await user.save();

    res.json({
        success:true,
        message:"User Banned"
    });

});
const WithdrawRequest =
require("../models/WithdrawRequest");

router.get(
"/withdraws",
adminAuth,
async (req, res) => {

    const requests =
    await WithdrawRequest.find({
        status: "pending"
    });

    res.json({
        success:true,
        total: requests.length,
        data: requests
    });

});

router.post(
"/withdraw/approve/:id",
adminAuth,
async (req, res) => {

    const request =
    await WithdrawRequest.findById(req.params.id);

    if (!request) {
        return res.status(404).json({
            success:false,
            message:"Request not found"
        });
    }

    const creator =
    await PremiumUser.findById(
        request.creatorId
    );

    // Coins → Rupees Conversion
    const rupees =
    (request.amount * 99) / 10000;

    creator.walletBalance -= request.amount;

    await creator.save();

    request.status = "approved";

    await request.save();

    res.json({
        success:true,
        message:"Withdraw Approved",
        coinsDeducted: request.amount,
        amountToPay: rupees
    });

});


router.post(
"/withdraw/reject/:id",
adminAuth,
async (req, res) => {

    const request =
    await WithdrawRequest.findById(req.params.id);

    if (!request) {
        return res.status(404).json({
            success:false,
            message:"Request not found"
        });
    }

    request.status = "rejected";

    await request.save();

    res.json({
        success:true,
        message:"Withdraw Rejected"
    });

});

module.exports = router;