const dotenv = require("dotenv");
const http = require("http");
const app = require("./app");
const connectDB = require("./src/config/db");
const { initializeSocket } = require("./src/socket/socket");

// Load env variables
dotenv.config();

// Connect Database
connectDB();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Start Server
server.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${NODE_ENV} mode on port ${PORT}`
  );
});