const express = require("express");

const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  logout,
  setOnline,
  setOffline,
  updateLastActive,
  getOnlineUsers
} = require("../controller/auth.contriller");

const {
  createMeeting,
  getMeetings,
  MeetingRequestingForMentor
} = require("../controller/meeting");

const { getMentors } = require("../controller/mentor");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");

const User = require("../models/User");
const Message = require("../models/Message");
const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

router.get("/me", protect, getMe);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);



router.post("/meetings", protect, authorize("mentor"), createMeeting);

router.get(
  "/meetings",
  protect,
  authorize("mentor", "student", "admin"),
  getMeetings
);

router.post(
  "/meetings-request",
  protect,
  authorize("student"),
  MeetingRequestingForMentor
);



router.get(
  "/mentors",
  protect,
  authorize("student", "admin"),
  getMentors
);


router.get("/users", protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const users = await User.find({
      _id: { $ne: currentUserId }
    })
      .select("-password -__v")
      .lean();

    const usersWithMeta = await Promise.all(
      users.map(async (user) => {
        const room1 = `${currentUserId}_${user._id}`;
        const room2 = `${user._id}_${currentUserId}`;

        const lastMessage = await Message.findOne({
          $or: [{ roomId: room1 }, { roomId: room2 }]
        })
          .sort({ createdAt: -1 })
          .select("createdAt")
          .lean();

        const unreadCount = await Message.countDocuments({
          roomId: { $in: [room1, room2] },
          sender: user._id,
          seen: false
        });

        return {
          ...user,
          online: user.online || false,
          lastActive: user.lastActive || null,
          lastMessageTime: lastMessage?.createdAt || 0,
          unreadCount
        };
      })
    );

    const sortedUsers = usersWithMeta.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

      return (
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
      );
    });

    res.json(sortedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});



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
    console.error(error);
  }
});



router.put("/online", protect, setOnline);
router.put("/offline", protect, setOffline);
router.put("/last-active", protect, updateLastActive);
router.get("/online-users", getOnlineUsers);



module.exports = router;