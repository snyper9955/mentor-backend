const { Server } = require("socket.io");
const Message = require("../models/Message");
const User = require("../models/User");

let io;

// ✅ Track multi-tab users
const onlineUsers = new Map();

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        callback(null, true);
      },
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ Connected:", socket.id);

    /* =====================================================
       REGISTER USER (CALL THIS FROM FRONTEND AFTER LOGIN)
    ===================================================== */
    socket.on("register", async (userId) => {
      if (!userId) return;

      socket.userId = userId;

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }

      onlineUsers.get(userId).add(socket.id);

      // ✅ Mark user ONLINE in DB
      await User.findByIdAndUpdate(userId, {
        online: true,
      });

      // ✅ Broadcast online status
      io.emit("user_online", { userId });

      console.log("🟢 User Online:", userId);
    });

    /* =====================================================
       JOIN CHAT ROOM
    ===================================================== */
    socket.on("join_chat", ({ roomId }) => {
      if (!roomId) return;

      socket.join(roomId);
      console.log("📥 Joined Room:", roomId);
    });

    /* =====================================================
       TYPING INDICATOR
    ===================================================== */
    socket.on("typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("typing", { userId });
    });

    socket.on("stop_typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("stop_typing", { userId });
    });

    /* =====================================================
       SEND MESSAGE
    ===================================================== */
    socket.on("send_message", async (data) => {
      try {
        const { roomId, message, sender, receiver } = data;

        if (!roomId || !message) return;

        const savedMessage = await Message.create({
          roomId,
          message,
          sender,
        });

        // ✅ Emit to room
        io.to(roomId).emit("receive_message", savedMessage);

        console.log("📩 Message Saved & Sent");
      } catch (error) {
        console.log("❌ Send Message Error:", error);
      }
    });

    /* =====================================================
       MARK MESSAGE AS SEEN
    ===================================================== */
    socket.on("mark_seen", async ({ roomId, userId }) => {
      try {
        await Message.updateMany(
          {
            roomId,
            sender: { $ne: userId },
          },
          {
            $set: { seen: true },
          }
        );

        // Notify sender
        socket.to(roomId).emit("messages_seen", {
          roomId,
          userId,
        });

        console.log("👁 Messages marked seen");
      } catch (err) {
        console.log("Seen Error:", err);
      }
    });

    /* =====================================================
       DISCONNECT
    ===================================================== */
    socket.on("disconnect", async () => {
      console.log("🔴 Disconnected:", socket.id);

      const userId = socket.userId;

      if (userId && onlineUsers.has(userId)) {
        const sockets = onlineUsers.get(userId);
        sockets.delete(socket.id);

        if (sockets.size === 0) {
          onlineUsers.delete(userId);

          // ✅ Mark Offline in DB
          await User.findByIdAndUpdate(userId, {
            online: false,
            lastActive: new Date(),
          });

          // ✅ Broadcast offline
          io.emit("user_offline", {
            userId,
            lastActive: new Date(),
          });
        }
      }
    });
  });
};

const getIO = () => io;

module.exports = {
  initializeSocket,
  getIO,
}; 