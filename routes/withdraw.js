const express = require("express");
const router = express.Router();

const WithdrawRequest =
require("../models/WithdrawRequest");

const PremiumUser =
require("../models/PremiumUser");

router.post("/request", async (req, res) => {
    try {

        const {
            creatorId,
            amount,
            upiId
        } = req.body;

        const creator =
        await PremiumUser.findById(creatorId);

        if (!creator) {
            return res.status(404).json({
                success:false,
                message:"Creator not found"
            });
        }

        if (creator.walletBalance < amount) {
            return res.status(400).json({
                success:false,
                message:"Insufficient balance"
            });
        }

        const request =
        await WithdrawRequest.create({
            creatorId,
            amount,
            upiId
        });

        res.status(201).json({
            success:true,
            message:"Withdraw request submitted",
            data: request
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success:false,
            message:"Server Error"
        });
    }
});


router.get("/dashboard/:creatorId", async (req, res) => {
    try {

        const creator =
        await PremiumUser.findById(
            req.params.creatorId
        );

        if (!creator) {
            return res.status(404).json({
                success: false,
                message: "Creator not found"
            });
        }

        const WithdrawRequest =
        require("../models/WithdrawRequest");

        const pendingWithdraw =
        await WithdrawRequest.aggregate([
            {
                $match: {
                    creatorId: creator._id,
                    status: "pending"
                }
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: "$amount"
                    }
                }
            }
        ]);

        const approvedWithdraw =
        await WithdrawRequest.aggregate([
            {
                $match: {
                    creatorId: creator._id,
                    status: "approved"
                }
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: "$amount"
                    }
                }
            }
        ]);

        res.json({
            success: true,

            data: {
                walletBalance:
                    creator.walletBalance,

                totalEarnings:
                    creator.totalEarnings,

                pendingWithdraw:
                    pendingWithdraw[0]?.total || 0,

                withdrawn:
                    approvedWithdraw[0]?.total || 0,

                earningsInRupees:
                    (
                        creator.totalEarnings *
                        99
                    ) / 10000
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


const WalletTransaction =
require("../models/WalletTransaction");

router.get(
"/history/:creatorId",
async (req, res) => {

    const history =
    await WalletTransaction.find({
        creatorId: req.params.creatorId
    })
    .sort({ createdAt: -1 });

    res.json({
        success: true,
        total: history.length,
        data: history
    });

});
module.exports = router;