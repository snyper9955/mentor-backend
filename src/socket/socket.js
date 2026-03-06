const { Server } = require("socket.io");
const Message = require("../models/Message");
const User = require("../models/User");

let io;

const onlineUsers = new Map();

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {

    socket.on("register", async (userId) => {
      if (!userId) return;

      socket.userId = userId;

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }

      onlineUsers.get(userId).add(socket.id);

      await User.findByIdAndUpdate(
        userId,
        { online: true },
        { returnDocument: "after" }
      );

      io.emit("user_online", { userId });
    });

    socket.on("join_chat", ({ roomId }) => {
      if (!roomId) return;
      socket.join(roomId);
    });

    socket.on("typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("typing", { userId });
    });

    socket.on("stop_typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("stop_typing", { userId });
    });

    socket.on("send_message", async (data) => {
      try {
        const { roomId, message, sender, receiver, file, timestamp } = data;

        if (!roomId || !message || !sender || !receiver) {
          return socket.emit("error", { message: "Missing required fields" });
        }

        const messageData = {
          roomId,
          message,
          sender,
          receiver,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        };

        if (file) messageData.file = file;

        const savedMessage = await Message.create(messageData);

        io.to(roomId).emit("receive_message", {
          ...savedMessage.toObject(),
          _id: savedMessage._id,
        });
      } catch (error) {
        socket.emit("error", {
          message: "Failed to send message",
          details: error.message,
        });
      }
    });

    socket.on("mark_seen", async ({ roomId, userId }) => {
      try {
        await Message.updateMany(
          { roomId, receiver: userId, seen: false },
          { $set: { seen: true } }
        );

        socket.to(roomId).emit("messages_seen", { roomId, userId });
      } catch (error) {}
    });

    socket.on("get_messages", async ({ roomId }) => {
      try {
        const messages = await Message.find({ roomId })
          .sort({ timestamp: 1 })
          .limit(100);

        socket.emit("load_messages", messages);
      } catch (error) {
        socket.emit("load_messages", []);
      }
    });

    socket.on("disconnect", async () => {
      const userId = socket.userId;

      if (userId && onlineUsers.has(userId)) {
        const sockets = onlineUsers.get(userId);
        sockets.delete(socket.id);

        if (sockets.size === 0) {
          onlineUsers.delete(userId);

          await User.findByIdAndUpdate(
            userId,
            {
              online: false,
              lastActive: new Date(),
            },
            { returnDocument: "after" }
          );

          io.emit("user_offline", {
            userId,
            lastActive: new Date().toISOString(),
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