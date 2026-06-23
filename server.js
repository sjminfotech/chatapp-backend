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
const withdrawRoutes = require("./routes/withdraw");

// ================= MODELS =================
const CoinWallet = require("./models/CoinWallet");
const PremiumUser = require("./models/PremiumUser");

// ================= APP =================
const app = express();

// ================= DB =================
connectDB();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC =================
app.use("/uploads", express.static("uploads"));

// ================= ROUTES =================
app.use("/api/admin", adminRoutes);

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

app.use("/api/payment", require("./routes/paymentRequest"));

app.use("/api/withdraw", withdrawRoutes);

// ================= SERVER =================
const server = http.createServer(app);

// ================= SOCKET.IO =================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ================= ONLINE USERS =================
const onlineUsers = new Map();

// ================= SOCKET CONNECTION =================
io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  // ================= JOIN =================
  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);

    io.emit(
      "onlineUsers",
      Array.from(onlineUsers.keys())
    );

    console.log("Joined User:", userId);
  });

  // ================= NORMAL CHAT =================
  socket.on("sendMessage", (data) => {
    const receiverSocket =
      onlineUsers.get(data.receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit(
        "receiveMessage",
        data
      );
    }
  });

  // ================= PREMIUM CHAT =================
  socket.on("premium-send-message", (data) => {
    console.log("Premium Message:", data);

    const receiverSocket =
      onlineUsers.get(data.receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit(
        "premium-receive-message",
        data
      );
    }
  });

  // ================= TYPING =================
  socket.on("typing", ({ receiverId, senderId }) => {
    const receiverSocket =
      onlineUsers.get(receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit(
        "typing",
        { senderId }
      );
    }
  });

  socket.on(
    "stopTyping",
    ({ receiverId, senderId }) => {
      const receiverSocket =
        onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit(
          "stopTyping",
          { senderId }
        );
      }
    }
  );

  // ================= CALL ROOM =================
  socket.on("join-call", (callId) => {
    socket.join(callId);

    console.log(
      `Joined Call Room: ${callId}`
    );
  });

  // ================= WEBRTC OFFER =================
  socket.on(
    "offer",
    ({ callId, offer }) => {
      socket.to(callId).emit("offer", {
        offer,
      });
    }
  );

  // ================= WEBRTC ANSWER =================
  socket.on(
    "answer",
    ({ callId, answer }) => {
      socket.to(callId).emit("answer", {
        answer,
      });
    }
  );

  // ================= ICE CANDIDATE =================
  socket.on(
    "ice-candidate",
    ({ callId, candidate }) => {
      socket
        .to(callId)
        .emit("ice-candidate", {
          candidate,
        });
    }
  );

  // ================= LIVE CALL BILLING =================
  socket.on(
    "start-live-call",
    async ({
      callId,
      callerId,
      receiverId,
    }) => {
      let minutes = 0;

      const interval = setInterval(
        async () => {
          try {
            const wallet =
              await CoinWallet.findOne({
                userId: callerId,
              });

            if (
              !wallet ||
              wallet.coins < 50
            ) {
              clearInterval(interval);

              io.to(callId).emit(
                "call-ended",
                {
                  reason:
                    "Insufficient Coins",
                }
              );

              return;
            }

            wallet.coins -= 50;
            wallet.totalSpent += 50;

            await wallet.save();

            const creator =
              await PremiumUser.findById(
                receiverId
              );

            if (creator) {
              creator.walletBalance += 15;
              creator.totalEarnings += 15;

              await creator.save();
            }

            minutes++;

            io.to(callId).emit(
              "call-update",
              {
                minutes,
                remainingCoins:
                  wallet.coins,
              }
            );
          } catch (err) {
            console.log(err);
          }
        },
        60000
      );

      socket.on("end-call", () => {
        clearInterval(interval);

        io.to(callId).emit(
          "call-ended",
          {
            reason:
              "Call Ended By User",
          }
        );
      });
    }
  );

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    for (let [
      userId,
      socketId,
    ] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit(
      "onlineUsers",
      Array.from(onlineUsers.keys())
    );

    console.log(
      "❌ User Disconnected:",
      socket.id
    );
  });
});

// ================= HOME ROUTE =================
app.get("/", (req, res) => {
  res.send("Chat App Backend Running...");
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server Running On Port ${PORT}`
  );
});