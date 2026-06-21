const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // Imported mongoose for transactions

const PremiumMessage = require("../models/PremiumMessage");
const PremiumUser = require("../models/PremiumUser");
const CoinWallet = require("../models/CoinWallet");
const CoinTransaction = require("../models/CoinTransaction");
const WalletTransaction = require("../models/WalletTransaction");
const PremiumConversation = require("../models/PremiumConversation");
const cloudinary = require("../config/cloudinary");
const uploadMedia = require("../middleware/uploadMedia");
const uploadAudio = require("../middleware/uploadAudio");

const COST = {
  image: 5,
  audio: 10,
  video: 20
};

async function deductCoins(userId, amount) {
  const wallet = await CoinWallet.findOne({ userId });

  if (!wallet || wallet.coins < amount) {
    return { success: false };
  }

  wallet.coins -= amount;
  await wallet.save();

  return {
    success: true,
    wallet
  };
}
/* =========================
   SEND MESSAGE
========================= */
/* =========================
   SEND MESSAGE (बिना ट्रांजैक्शन के - सेफ और आसान)
========================= */
/* =========================
   SEND MESSAGE (नया लॉजिक: Premium भेजेगा फ्री, Buser रिप्लाई करेगा तो Premium के कॉइन कटेंगे)
========================= */
router.post("/send-message", async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message required" });
    }

    const sender = await PremiumUser.findById(senderId);
    const receiver = await PremiumUser.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // कन्वर्सेशन ढूंढें या नया बनाएं
    const conversation = await PremiumConversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }) || await PremiumConversation.create({
      participants: [senderId, receiverId]
    });

    // 👑 स्थिति A: अगर भेजने वाला PREMIUM यूजर है -> मैसेज हमेशा FREE जाएगा (अभी कॉइन नहीं कटेंगे)
    if (sender.role === "user") {
      const newMessage = await PremiumMessage.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        message,
        coinsCharged: 0,
        isPaid: false // अभी इसके पैसे नहीं कटे हैं, यह बसूर के रिप्लाई का वेट करेगा
      });

      return res.json({
        success: true,
        message: "Message sent by premium (Free until buser replies)",
        data: newMessage
      });
    }

    // 👤 स्थिति B: अगर भेजने वाला BUSER है (यानी यह PREMIUM के मैसेज का REPLY है)
    if (sender.role === "buser") {
      
      // 🔍 चेक करें कि क्या प्रीमियम यूजर का कोई ऐसा मैसेज है जिसके पैसे अभी तक नहीं कटे हैं?
      const unpaidPremiumMessage = await PremiumMessage.findOne({
        conversationId: conversation._id,
        senderId: receiverId, // premium ने भेजा था
        receiverId: senderId, // buser को मिला था
        isPaid: false
      });

      let coinDeducted = false;
      let remainingPremiumCoins = null;

      // अगर प्रीमियम का पुराना अनपेड मैसेज मिल जाता है, तो अब प्रीमियम के वॉलेट से सिक्के काटेंगे!
      if (unpaidPremiumMessage) {
        const premiumWallet = await CoinWallet.findOne({ userId: receiverId }); // premium का वॉलेट

        // चेक करें कि प्रीमियम के पास 10 सिक्के हैं या नहीं
        if (!premiumWallet || premiumWallet.coins < 10) {
          return res.status(400).json({
            success: false,
            message: "Premium user has insufficient coins to process this conversation."
          });
        }

        // 1. Premium यूजर के वॉलेट से 10 सिक्के काटें
        premiumWallet.coins -= 10;
        premiumWallet.totalSpent += 10;
        await premiumWallet.save();
        remainingPremiumCoins = premiumWallet.coins;

        // 2. Buser (जो अभी रिप्लाई कर रहा है) को 3 सिक्के दें
        let buserWallet = await CoinWallet.findOne({ userId: senderId });
        if (!buserWallet) {
          buserWallet = new CoinWallet({ userId: senderId, coins: 0 });
        }
        buserWallet.coins += 3;
        await buserWallet.save();

        // 3. Admin को 7 सिक्के दें
        const admin = await PremiumUser.findOne({ role: "admin" });
        if (admin) {
          let adminWallet = await CoinWallet.findOne({ userId: admin._id });
          if (!adminWallet) {
            adminWallet = new CoinWallet({ userId: admin._id, coins: 0 });
          }
          adminWallet.coins += 7;
          await adminWallet.save();
        }

        // 4. Premium के उस पुराने मैसेज को 'isPaid = true' मार्क करें और सिक्के अपडेट करें
        unpaidPremiumMessage.isPaid = true;
        unpaidPremiumMessage.coinsCharged = 10;
        await unpaidPremiumMessage.save();

        coinDeducted = true;
      }

      // Buser का मैसेज डेटाबेस में सेव करें
      const newMessage = await PremiumMessage.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        message,
        coinsCharged: 0, 
        isPaid: true
      });

      return res.json({
        success: true,
        message: coinDeducted ? "Buser replied & coins deducted from Premium user" : "Message sent",
        data: newMessage
      });
    }

  } catch (error) {
    console.log("Error in send-message:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
/* =========================
   CONVERSATION LIST
========================= */
router.get("/conversations/:userId", async (req, res) => {
    try {
        const conversations = await PremiumConversation.find({
            participants: req.params.userId
        })
        .populate("participants", "name username")
        .sort({ lastMessageAt: -1 });

        res.json({
            success: true,
            conversations
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

/* =========================
   CHAT HISTORY (2 USERS)
========================= */
router.get("/messages/:senderId/:receiverId", async (req, res) => {
    try {
        const { senderId, receiverId } = req.params;

        const messages = await PremiumMessage.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId }
            ]
        })
        .sort({ createdAt: 1 })
        .populate("senderId receiverId", "name username");

        res.json({
            success: true,
            messages
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.post("/mark-seen", async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;

        await PremiumMessage.updateMany(
            {
                senderId,
                receiverId,
                seen: false
            },
            {
                $set: {
                    seen: true,
                    seenAt: new Date()
                }
            }
        );

        res.json({
            success: true,
            message: "Messages marked as seen"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.get("/unread/:userId", async (req, res) => {
    try {
        const count = await PremiumMessage.countDocuments({
            receiverId: req.params.userId,
            seen: false
        });

        res.json({
            success: true,
            unread: count
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
});

router.post("/send-image", uploadMedia.single("file"), async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required" });
    }

    const sender = await PremiumUser.findById(senderId);
    const receiver = await PremiumUser.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // कन्वर्सेशन ढूंढें या नया बनाएं
    const conversation = await PremiumConversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }) || await PremiumConversation.create({
      participants: [senderId, receiverId]
    });

    // 👑 स्थिति A: अगर भेजने वाला PREMIUM यूजर है (role: "user")
    if (sender.role === "user") {
      const premiumWallet = await CoinWallet.findOne({ userId: senderId });

      // चेक करें कि प्रीमियम यूजर के पास 10 सिक्के हैं या नहीं
      if (!premiumWallet || premiumWallet.coins < 10) {
        return res.status(400).json({
          success: false,
          message: "Insufficient coins! You need 10 coins to send an image."
        });
      }

      // 1. Premium यूजर के वॉलेट से 10 सिक्के काटें
      premiumWallet.coins -= 10;
      premiumWallet.totalSpent += 10;
      await premiumWallet.save();

      // 2. Receiver यानी Buser को 3 सिक्के तुरंत दें
      let buserWallet = await CoinWallet.findOne({ userId: receiverId });
      if (!buserWallet) {
        buserWallet = new CoinWallet({ userId: receiverId, coins: 0 });
      }
      buserWallet.coins += 3;
      await buserWallet.save();

      // 3. Admin को 7 सिक्के ट्रांसफर करें
      const admin = await PremiumUser.findOne({ role: "admin" });
      if (admin) {
        let adminWallet = await CoinWallet.findOne({ userId: admin._id });
        if (!adminWallet) {
          adminWallet = new CoinWallet({ userId: admin._id, coins: 0 });
        }
        adminWallet.coins += 7;
        await adminWallet.save();
      }

      // 4. प्रीमियम का इमेज मैसेज Database में सेव करें
      const msg = await PremiumMessage.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        message: "🖼️ Image",
        messageType: "image",
        image: req.file.path, // Cloudinary या लोकल पाथ URL
        coinsCharged: 10,     // 10 कॉइन्स चार्ज हुए
        isPaid: true
      });

      return res.json({
        success: true,
        data: msg,
        remainingCoins: premiumWallet.coins // फ्रंटएंड लाइव अपडेट के लिए
      });
    }

    // 👤 स्थिति B: अगर भेजने वाला BUSER है (role: "buser") -> बसूर के लिए इमेज हमेशा फ्री
    if (sender.role === "buser") {
      const msg = await PremiumMessage.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        message: "🖼️ Image",
        messageType: "image",
        image: req.file.path,
        coinsCharged: 0, 
        isPaid: true
      });

      return res.json({
        success: true,
        data: msg
      });
    }

  } catch (err) {
    console.log("IMAGE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server Error during image custom distribution"
    });
  }
});

router.post("/send-video", uploadMedia.single("file"), async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Video file is required" });
    }

    const sender = await PremiumUser.findById(senderId);
    const receiver = await PremiumUser.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // कन्वर्सेशन ढूंढें या नया बनाएं
    const conversation = await PremiumConversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }) || await PremiumConversation.create({
      participants: [senderId, receiverId]
    });

    // 👑 स्थिति A: अगर भेजने वाला PREMIUM यूजर है (role: "user")
    if (sender.role === "user") {
      const premiumWallet = await CoinWallet.findOne({ userId: senderId });

      // चेक करें कि प्रीमियम यूजर के पास 10 सिक्के हैं या नहीं
      if (!premiumWallet || premiumWallet.coins < 10) {
        return res.status(400).json({
          success: false,
          message: "Insufficient coins! You need 10 coins to send a video."
        });
      }

      // 1. Premium यूजर के वॉलेट से 10 सिक्के काटें
      premiumWallet.coins -= 10;
      premiumWallet.totalSpent += 10;
      await premiumWallet.save();

      // 2. Receiver यानी Buser को 3 सिक्के तुरंत दें
      let buserWallet = await CoinWallet.findOne({ userId: receiverId });
      if (!buserWallet) {
        buserWallet = new CoinWallet({ userId: receiverId, coins: 0 });
      }
      buserWallet.coins += 3;
      await buserWallet.save();

      // 3. Admin को 7 सिक्के ट्रांसफर करें
      const admin = await PremiumUser.findOne({ role: "admin" });
      if (admin) {
        let adminWallet = await CoinWallet.findOne({ userId: admin._id });
        if (!adminWallet) {
          adminWallet = new CoinWallet({ userId: admin._id, coins: 0 });
        }
        adminWallet.coins += 7;
        await adminWallet.save();
      }

      // 4. प्रीमियम का वीडियो मैसेज Database में सेव करें
      const msg = await PremiumMessage.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        message: "🎥 Video",
        messageType: "video",
        video: req.file.path, // Cloudinary या लोकल पाथ URL
        coinsCharged: 10,     // 10 कॉइन्स चार्ज हुए
        isPaid: true
      });

      return res.json({
        success: true,
        data: msg,
        remainingCoins: premiumWallet.coins // फ्रंटएंड लाइव अपडेट के लिए
      });
    }

    // 👤 स्थिति B: अगर भेजने वाला BUSER है (role: "buser") -> बसूर के लिए वीडियो हमेशा फ्री
    if (sender.role === "buser") {
      const msg = await PremiumMessage.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        message: "🎥 Video",
        messageType: "video",
        video: req.file.path,
        coinsCharged: 0, 
        isPaid: true
      });

      return res.json({
        success: true,
        data: msg
      });
    }

  } catch (err) {
    console.log("VIDEO ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server Error during video custom distribution"
    });
  }
});

router.post("/send-audio", uploadMedia.single("file"), async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  
  try {
    const { senderId, receiverId } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    const sender = await PremiumUser.findById(senderId);
    const receiver = await PremiumUser.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // कन्वर्सेशन ढूंढें या नया बनाएं
    const conversation = await PremiumConversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }) || await PremiumConversation.create({
      participants: [senderId, receiverId]
    });

    // 👑 स्थिति A: अगर भेजने वाला PREMIUM यूजर है (role: "user")
    if (sender.role === "user") {
      const premiumWallet = await CoinWallet.findOne({ userId: senderId });

      // चेक करें कि प्रीमियम यूजर के पास 10 सिक्के हैं या नहीं
      if (!premiumWallet || premiumWallet.coins < 10) {
        return res.status(400).json({
          success: false,
          message: "Insufficient coins! You need 10 coins to send a voice message."
        });
      }

      // 1. Premium यूजर के वॉलेट से 10 सिक्के काटें
      premiumWallet.coins -= 10;
      premiumWallet.totalSpent += 10;
      await premiumWallet.save();

      // 2. Receiver यानी Buser को 3 सिक्के तुरंत दें
      let buserWallet = await CoinWallet.findOne({ userId: receiverId });
      if (!buserWallet) {
        buserWallet = new CoinWallet({ userId: receiverId, coins: 0 });
      }
      buserWallet.coins += 3;
      await buserWallet.save();

      // 3. Admin को 7 सिक्के ट्रांसफर करें
      const admin = await PremiumUser.findOne({ role: "admin" });
      if (admin) {
        let adminWallet = await CoinWallet.findOne({ userId: admin._id });
        if (!adminWallet) {
          adminWallet = new CoinWallet({ userId: admin._id, coins: 0 });
        }
        adminWallet.coins += 7;
        await adminWallet.save();
      }

      // 4. प्रीमियम का ऑडियो मैसेज Database में सेव करें
      const msg = await PremiumMessage.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        message: "🎤 Voice Message",
        messageType: "audio",
        audio: req.file.path, // Cloudinary URL
        coinsCharged: 10,     // 10 कॉइन्स चार्ज हुए
        isPaid: true          // तुरंत पैसे कट गए हैं
      });

      return res.json({
        success: true,
        data: msg,
        remainingCoins: premiumWallet.coins // फ्रंटएंड पर कॉइन्स तुरंत कम करने के लिए
      });
    }

    // 👤 स्थिति B: अगर भेजने वाला BUSER है (role: "buser") -> बसूर के लिए ऑडियो हमेशा फ्री रहेगा
    if (sender.role === "buser") {
      const msg = await PremiumMessage.create({
        conversationId: conversation._id,
        senderId,
        receiverId,
        message: "🎤 Voice Message",
        messageType: "audio",
        audio: req.file.path,
        coinsCharged: 0, 
        isPaid: true
      });

      return res.json({
        success: true,
        data: msg
      });
    }

  } catch (err) {
    console.log("========== AUDIO ERROR ==========");
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error during audio dynamic distribution"
    });
  }
});
module.exports = router;