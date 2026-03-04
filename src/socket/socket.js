// socket/index.js
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

      // ✅ Mark user ONLINE in DB - Fix deprecation warning
      await User.findByIdAndUpdate(
        userId, 
        { online: true },
        { returnDocument: 'after' } // Instead of { new: true }
      );

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
        const { roomId, message, sender, receiver, file, timestamp } = data;

        // Validate required fields
        if (!roomId || !message || !sender || !receiver) {
          console.log("❌ Missing required fields:", { roomId, message, sender, receiver });
          return socket.emit("error", { message: "Missing required fields" });
        }

        console.log("📨 Saving message:", { roomId, sender, receiver, message });

        // Create message object
        const messageData = {
          roomId,
          message,
          sender,
          receiver,
          timestamp: timestamp ? new Date(timestamp) : new Date()
        };

        // Add file if present
        if (file) {
          messageData.file = file;
        }

        const savedMessage = await Message.create(messageData);

        console.log("✅ Message saved with ID:", savedMessage._id);

        // ✅ Emit to room
        io.to(roomId).emit("receive_message", {
          ...savedMessage.toObject(),
          _id: savedMessage._id
        });

        console.log("📩 Message Sent to room:", roomId);
      } catch (error) {
        console.log("❌ Send Message Error:", error);
        
        // Send error back to client
        socket.emit("error", { 
          message: "Failed to send message",
          details: error.message 
        });
      }
    });

    /* =====================================================
       MARK MESSAGE AS SEEN
    ===================================================== */
    socket.on("mark_seen", async ({ roomId, userId }) => {
      try {
        const result = await Message.updateMany(
          {
            roomId,
            receiver: userId,
            seen: false
          },
          {
            $set: { seen: true }
          }
        );

        console.log(`👁 Marked ${result.modifiedCount} messages as seen`);

        // Notify sender
        socket.to(roomId).emit("messages_seen", {
          roomId,
          userId,
        });
      } catch (err) {
        console.log("Seen Error:", err);
      }
    });

    /* =====================================================
       GET MESSAGE HISTORY
    ===================================================== */
    socket.on("get_messages", async ({ roomId }) => {
      try {
        const messages = await Message.find({ roomId })
          .sort({ timestamp: 1 })
          .limit(100);

        socket.emit("load_messages", messages);
        console.log(`📚 Loaded ${messages.length} messages for room:`, roomId);
      } catch (error) {
        console.log("Error loading messages:", error);
        socket.emit("load_messages", []);
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

          try {
            // ✅ Mark Offline in DB - Fix deprecation warning
            await User.findByIdAndUpdate(
              userId,
              {
                online: false,
                lastActive: new Date(),
              },
              { returnDocument: 'after' } // Instead of { new: true }
            );

            // ✅ Broadcast offline
            io.emit("user_offline", {
              userId,
              lastActive: new Date().toISOString(),
            });
            console.log("🔴 User fully Offline:", userId);
          } catch (err) {
            console.log("Error marking user offline:", err);
          }
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