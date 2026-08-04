const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const uploadMedia = require("../middleware/uploadMedia");
const uploadAudio = require("../middleware/uploadAudio");
// Models
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");

// ==========================================
// 1. UNIFIED MEDIA UPLOAD API (Images/Videos/Audio)
// ==========================================
// ==========================================
// 1. FIXED MEDIA UPLOAD API (Matching your exact model)
// ==========================================
// ==========================================
// 1. FIXED MEDIA UPLOAD API (Matching your exact model)
// ==========================================
router.post("/media", auth, uploadMedia.single("media"), async (req, res) => {
  try {
    console.log("FILE DEBUG:", req.file);

    if (!req.file) {
      return res.status(400).json({
        message: "No file received from frontend (req.file is empty)"
      });
    }

    const conversationId = req.body.conversationId;

    if (!conversationId) {
      return res.status(400).json({ message: "conversationId missing" });
    }

    const detectedType = req.file.mimetype.startsWith("video")
      ? "video"
      : req.file.mimetype.startsWith("audio")
      ? "audio"
      : "image";

    const message = await Message.create({
      conversationId,
      sender: req.user.userId,
      mediaUrl: req.file.path,
      mediaType: detectedType,
      status: "sent",
    });

    const populated = await Message.findById(message._id).populate(
      "sender",
      "name image"
    );

    return res.json(populated);

  } catch (err) {
    console.log("MEDIA ERROR:", err);

    return res.status(500).json({
      message: err.message,
      name: err.name,
      full: JSON.stringify(err, Object.getOwnPropertyNames(err), 2),
    });
  }
});



// ==========================================
// 2. NORMAL TEXT MESSAGE CREATE API
// ==========================================
router.post("/", auth, async (req, res) => {
  const { conversationId, text } = req.body;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({ message: "Invalid conversationId" });
  }

  try {
    const message = await Message.create({
      conversationId,
      sender: req.user.userId || req.user.id,
      text,
    });

    const currentConversation = await Conversation.findById(conversationId);
    if (currentConversation) {
      const receiverId = currentConversation.members.find(
        (memberId) => memberId.toString() !== (req.user.userId || req.user.id).toString()
      );

      if (receiverId) {
        await User.findByIdAndUpdate(receiverId, {
          lastMessageSender: req.user.userId || req.user.id,
        });
      }
    }

    const populated = await Message.findById(message._id).populate(
      "sender",
      "name image"
    );

    return res.status(201).json(populated);
  } catch (err) {
    console.error("--- TEXT MESSAGE SERVER ERROR ---", err);
    return res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 3. GET CHAT PARTNERS
// ==========================================
router.get("/partners", auth, async (req, res) => {
  try {
    const currentUserId = req.user?.userId || req.user?.id || req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const conversations = await Conversation.find({
      members: currentUserId,
    });

    const partnerIds = new Set();
    conversations.forEach((c) => {
      c.members.forEach((id) => {
        if (id.toString() !== currentUserId.toString()) {
          partnerIds.add(id.toString());
        }
      });
    });

    const users = await User.find({
      _id: { $in: Array.from(partnerIds) },
    }).select("-password");

    return res.json(users);
  } catch (err) {
    console.error("--- PARTNERS SERVER ERROR ---", err);
    return res.status(500).json({ message: err.message });
  }
});

// Note: Ensure auth is placed BEFORE uploadMedia so unauthorized spam is rejected before parsing files
router.post("/audio", auth, uploadMedia.single("audio"), async (req, res) => {
  try {
    // 1. Debugging Logs 
    console.log("--- AUDIO UPLOAD DEBUG ---");
    console.log("FILE RECEIVED:", req.file);
    console.log("USER RECEIVED:", req.user);
    console.log("BODY RECEIVED:", req.body);
    console.log("--------------------------");

    // 2. Validate File Presence
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "Audio file missing or invalid file type." 
      });
    }

    // 3. Extract parameters safely (FIXED: matching your text/media routes)
    const senderId = req.user.userId || req.user.id; 
    const audioUrl = req.file.path;
    const { conversationId, receiverId } = req.body;

    // 4. Validate Required Body Fields
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Missing conversationId in request body."
      });
    }

    // 5. Save Message to Database
    const message = await Message.create({
      conversationId: conversationId,
      sender: senderId, // This will no longer be undefined!
      mediaUrl: audioUrl,
      mediaType: "audio", 
      status: "sent"
    });

    // 6. Context updating
    if (receiverId) {
      await User.findByIdAndUpdate(receiverId, {
        lastMessageSender: senderId,
      }).catch(err => console.log("Failed to update partner's lastMessageSender status:", err.message));
    }

    // 7. Populate sender details
    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name image"
    );

    // 8. Return Success Response
    return res.status(201).json({
      success: true,
      message: "Audio message sent successfully",
      data: populatedMessage
    });

  } catch (err) {
    console.error("AUDIO API ERROR STACK:", err);
    
    if (err.name === "ValidationError") {
      return res.status(400).json({ 
        success: false, 
        message: "Database validation failed", 
        errors: err.errors 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: "Server error during audio upload processing.",
      error: err.message
    });
  }
});
// ==========================================
// 4. GET MESSAGES BY CONVERSATION ID
// ==========================================
router.get("/:conversationId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    })
      .populate("sender", "name image")
      .sort({ createdAt: 1 });

    return res.json(messages);
  } catch (err) {
    console.error("--- GET MESSAGES SERVER ERROR ---", err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;