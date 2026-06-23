require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

// ================= ROUTES =================
const premiumRoutes = require("./routes/premium");
const postRoutes = require("./routes/post");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");
const coinRoutes = require("./routes/coins");
const premiumAuthRoutes = require("./routes/premiumAuth");
const premiumChatRoutes = require("./routes/premiumChat");
const premiumCallRoutes = require("./routes/premiumCall");
const adminRoutes = require("./routes/admin");
// ================= MODELS =================
const Message = require("./models/Message");
const CoinWallet = require("./models/CoinWallet");
const PremiumUser = require("./models/PremiumUser");
const withdrawRoutes =
require("./routes/withdraw");
// ================= APP INIT =================
const app = express();

// ================= DB =================
connectDB();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC =================
app.use("/uploads", express.static("uploads"));
app.use("/api/admin", adminRoutes);
// ================= ROUTES =================
app.use("/api/user", require("./routes/user"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/post", postRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/coins", coinRoutes);
app.use("/api/premium-chat", premiumChatRoutes);
app.use("/api/premium-auth", premiumAuthRoutes);
app.use("/api/premium-call", premiumCallRoutes);
// 🔽 पेमेंट रिक्वेस्ट के रूट को सर्वर में रजिस्टर करने के लिए यह कोड डालें
app.use("/api/payment", require("./routes/paymentRequest"));
// app.use("/api/admin", require("./routes/paymentRequest"));
app.use(
"/api/withdraw",
withdrawRoutes
);
// ================= SERVER =================
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ================= ONLINE USERS =================
const onlineUsers = new Map();

// ================= SOCKET =================
io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // ================= JOIN USER =================
    socket.on("join", (userId) => {
        onlineUsers.set(userId, socket.id);
        io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // ================= JOIN CALL ROOM =================
    socket.on("join-call", (callId) => {
        socket.join(callId);
    });

    // ================= WEBRTC SIGNALING =================
    socket.on("offer", ({ callId, offer }) => {
        socket.to(callId).emit("offer", { offer });
    });

    socket.on("answer", ({ callId, answer }) => {
        socket.to(callId).emit("answer", { answer });
    });

    socket.on("ice-candidate", ({ callId, candidate }) => {
        socket.to(callId).emit("ice-candidate", { candidate });
    });

    // ================= CHAT =================
    socket.on("sendMessage", (data) => {
        const receiverSocket = onlineUsers.get(data.receiverId);

        if (receiverSocket) {
            io.to(receiverSocket).emit("receiveMessage", data);
        }
    });

    socket.on("premium-send-message", (data) => {
  const receiverSocket =
    onlineUsers.get(data.receiverId);

  if (receiverSocket) {
    io.to(receiverSocket)
      .emit(
        "premium-receive-message",
        data
      );
  }
});

socket.on("receive-message", (msg) => {
  // 1. अगर आप उस चैट के अंदर नहीं हैं, तो अनरीड काउंट बढ़ाएं
  setUsers((prevUsers) => 
    prevUsers.map((u) => 
      u._id === msg.senderId ? { ...u, unreadCount: u.unreadCount + 1 } : u
    )
  );
});

    // ================= LIVE CALL BILLING SYSTEM =================
    socket.on("start-live-call", async (data) => {

        const { callId, callerId, receiverId } = data;

        let minutes = 0;

        const interval = setInterval(async () => {

            const wallet = await CoinWallet.findOne({ userId: callerId });

            if (!wallet || wallet.coins < 50) {

                clearInterval(interval);

                io.to(callId).emit("call-ended", {
                    reason: "Insufficient coins"
                });

                return;
            }

            // Deduct coins
            wallet.coins -= 50;
            wallet.totalSpent += 50;
            await wallet.save();

            // Creator earning
            const creator = await PremiumUser.findById(receiverId);

            if (creator) {
                creator.walletBalance += 15;
                creator.totalEarnings += 15;
                await creator.save();
            }

            minutes++;

            io.to(callId).emit("call-update", {
                minutes,
                remainingCoins: wallet.coins
            });

        }, 60000);
    });

    // ================= END CALL =================
    socket.on("end-call", (callId) => {
        io.to(callId).emit("call-ended", {
            reason: "Call ended by user"
        });
    });

    // ================= TYPING =================
    socket.on("typing", ({ receiverId, senderId }) => {
        const receiverSocket = onlineUsers.get(receiverId);

        if (receiverSocket) {
            io.to(receiverSocket).emit("typing", { senderId });
        }
    });

    socket.on("stopTyping", ({ receiverId, senderId }) => {
        const receiverSocket = onlineUsers.get(receiverId);

        if (receiverSocket) {
            io.to(receiverSocket).emit("stopTyping", { senderId });
        }
    });

    // ================= DISCONNECT =================
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

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});