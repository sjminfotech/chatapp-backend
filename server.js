require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const Message = require("./models/Message");

const postRoutes = require("./routes/post");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");
require('dotenv').config(); // यह लाइन आपके सर्वर में सबसे ऊपर होनी चाहिए
const app = express();

// ================= DB =================
connectDB();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= STATIC FILES =================
app.use("/uploads", express.static("uploads"));
// ================= ROUTES =================
app.use("/api/user", require("./routes/user"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/post", postRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// ================= SERVER =================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ================= ONLINE USERS =================
const onlineUsers = new Map();

/* ================= SOCKET CONNECTION ================= */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /* JOIN USER */
  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  /* SEND MESSAGE (LIVE CHAT) */
 socket.on("sendMessage", (data) => {
  const receiverSocket = onlineUsers.get(data.receiverId);

  if (receiverSocket) {
    io.to(receiverSocket).emit("receiveMessage", data);

    // ✅ FIX: use proper id fallback
    const msgId = data._id || data.messageId;

    if (msgId) {
      io.to(receiverSocket).emit("messageDeliveredUpdate", {
        messageId: msgId,
      });
    }
  }
});

  /* MESSAGE DELIVERED */
  socket.on("messageDelivered", async ({ messageId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, {
        status: "delivered",
      });

      io.emit("messageDeliveredUpdate", { messageId });
    } catch (err) {
      console.log("Delivered Error:", err);
    }
  });

  /* MESSAGE SEEN */
  socket.on("messageSeen", async ({ messageIds }) => {
    try {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        {
          status: "seen",
          seen: true,
          seenAt: new Date(),
        }
      );

      io.emit("messagesSeen", { messageIds });
    } catch (err) {
      console.log("Seen Error:", err);
    }
  });

  /* TYPING */
  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", { senderId });
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit("stopTyping", { senderId });
    }
  });

  /* USER STATUS */
  socket.on("userAway", (userId) => {
    io.emit("userStatus", { userId, status: "away" });
  });

  socket.on("userBack", (userId) => {
    io.emit("userStatus", { userId, status: "online" });
  });

  /* FOLLOW SYSTEM */
  socket.on("follow", ({ fromUser, toUser }) => {
    const targetSocket = onlineUsers.get(toUser);

    if (targetSocket) {
      io.to(targetSocket).emit("notification", {
        type: "follow",
        fromUser,
        message: "New follow request",
      });
    }
  });

  socket.on("followAccepted", ({ fromUser, toUser }) => {
    const targetSocket = onlineUsers.get(fromUser);

    if (targetSocket) {
      io.to(targetSocket).emit("notification", {
        type: "accepted",
        toUser,
        message: "Request accepted",
      });
    }
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    for (let [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    console.log("User disconnected:", socket.id);
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});