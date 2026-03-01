// ==============================
// 🌍 Environment Configuration
// ==============================

// Load .env only in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const http = require("http");
const app = require("./app");
const connectDB = require("./src/config/db");
const { initializeSocket } = require("./src/socket/socket");

// ==============================
// 🔧 Environment Variables
// ==============================
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ==============================
// 🗄️ Connect to Database
// ==============================
connectDB();

// ==============================
// 🌐 Create HTTP Server
// ==============================
const server = http.createServer(app);

// ==============================
// 🔌 Initialize Socket.IO
// ==============================
initializeSocket(server);

// ==============================
// 🚀 Start Server
// ==============================
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// ==============================
// ❌ Handle Server Errors
// ==============================
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error("❌ Server Error:", error);
  }
  process.exit(1);
});

// ==============================
// 💥 Handle Unhandled Rejections
// ==============================
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err.message);
  server.close(() => process.exit(1));
});

// ==============================
// 🛑 Graceful Shutdown
// ==============================
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("💤 Process terminated");
  });
});