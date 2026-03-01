const express = require("express");
const { register, getUsers, login, getMe, resetPassword, forgotPassword, logout } = require("../controller/auth.contriller");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");
const { createMeeting, getMeetings, MeetingRequestingForMentor } = require("../controller/meeting");
const { getMentors } = require("../controller/mentor");
const User = require("../models/User");
const Message = require("../models/Message"); // ✅ ADD THIS
const router = express.Router();


router.post("/register", register)
router.get("/users", getUsers)
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/logout", logout);


router.post("/meetings",protect,authorize("mentor"),createMeeting);
router.get(
  "/meetings",
  protect,
  authorize("mentor", "student", "admin"),
  getMeetings
);

router.post("/meetings-request",protect,authorize("student"),MeetingRequestingForMentor);
router.get(
  "/meetings",
  protect,
  authorize("mentor", "student", "admin"),
  getMeetings
);

router.get(
  "/mentors",
  protect,
  authorize("student", "admin"),
  getMentors
);


router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -__v");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});





/*
=================================================
✅ Get All Users (Sorted By Latest Message)
=================================================
*/router.get("/users", protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // ✅ Get all users except current user
    const users = await User.find({
      _id: { $ne: currentUserId },
    })
      .select("-password -__v")
      .lean();

    // ✅ Attach last message + unread count
    const usersWithMeta = await Promise.all(
      users.map(async (user) => {
        const room1 = `${currentUserId}_${user._id}`;
        const room2 = `${user._id}_${currentUserId}`;

        // 🔥 Get last message
        const lastMessage = await Message.findOne({
          $or: [{ roomId: room1 }, { roomId: room2 }],
        })
          .sort({ createdAt: -1 })
          .select("createdAt")
          .lean();

        // 🔥 Count unread messages (messages sent by user to me and not seen)
        const unreadCount = await Message.countDocuments({
          roomId: { $in: [room1, room2] },
          sender: user._id,
          seen: false,
        });

        return {
          ...user,
          online: user.online || false,
          lastActive: user.lastActive || null,
          lastMessageTime: lastMessage?.createdAt || 0,
          unreadCount,
        };
      })
    );

    // ✅ Sort by latest message OR unread priority
    const sortedUsers = usersWithMeta.sort((a, b) => {
      // 🔥 Priority 1 → Users with unread messages on top
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

      // 🔥 Priority 2 → Sort by last message time
      return (
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
      );
    });

    res.json(sortedUsers);
  } catch (error) {
    console.error("User Fetch Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});


// Get single user by ID
// ✅ Get single user by ID
router.get("/user/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("name email online lastActive")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("User Fetch Error:", error);
  }
});

module.exports = router;