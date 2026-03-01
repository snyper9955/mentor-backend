const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./src/routes/authRoutes");
const messageRoutes = require("./src/routes/messageRoutes");
const activity = require("./src/routes/activity");

const app = express();

// ✅ Trust Proxy for Render HTTPS Load Balancer
app.set("trust proxy", 1);

// ✅ CORS
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());





// ✅ Routes (Better Structure)
app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);
app.use("/api/activity", activity);





app.get("/", (req, res) => {
  res.status(200).json({
    message: "API is running 🚀",
  });
});



module.exports = app;