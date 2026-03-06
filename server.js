
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const http = require("http");
const app = require("./app");
const connectDB = require("./src/config/db");
const { initializeSocket } = require("./src/socket/socket");


const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

connectDB();


const server = http.createServer(app);


initializeSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
});


server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error("❌ Server Error:", error);
  }
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err.message);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("💤 Process terminated");
  });
});