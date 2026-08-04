const express = require("express");
const router = express.Router();
const AccessSession = require("../models/AccessSession");
const CoinWallet = require("../models/CoinWallet");

router.post("/unlock-profile", async (req, res) => {
    const { visitorId, targetId } = req.body; // User IDs

    try {
        const wallet = await CoinWallet.findOne({ userId: visitorId });
        
        if (!wallet || wallet.coins < 2000) {
            return res.status(400).json({ message: "Insufficient coins" });
        }

        // Coins deduct karein
        wallet.coins -= 2000;
        await wallet.save();

        // 1 ghante ka session create karein
        const expiry = new Date(Date.now() + 60 * 60 * 1000);
        await AccessSession.create({ visitorId, targetId, expiryTime: expiry });

        res.status(200).json({ message: "Unlocked successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;