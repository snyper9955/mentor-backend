const router = require("express").Router();
const Message = require("../models/Message");

/*
=================================================
✅ GET Messages By Room
=================================================
*/

router.get("/messages/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "RoomId is required",
      });
    }

    const messages = await Message.find({ roomId }).sort({
      createdAt: 1,
    });

    res.status(200).json({
      success: true,
      messages,
    });

  } catch (error) {
    console.error("Message Fetch Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});



/*
=================================================
✅ GET All Messages (Admin / Debug Purpose)
=================================================
*/
router.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});


/*
=================================================
✅ Create Message (REST Backup)
=================================================
*/
router.post("/messages", async (req, res) => {
  try {
    const { roomId, message, sender } = req.body;

    if (!roomId || !message || !sender) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newMessage = await Message.create({
      roomId,
      message,
      sender,
    });

    res.status(201).json({
      success: true,
      message: newMessage,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});


/*
=================================================
✅ Delete Message
=================================================
*/
router.delete("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Message.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.json({
      success: true,
      message: "Message deleted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});



/*
=================================================
✅ Edit Message
=================================================
*/
router.put("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const updated = await Message.findByIdAndUpdate(
      id,
      { message },
      { new: true }
    );

    res.json({
      success: true,
      message: updated,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});




/*
=================================================
✅ Mark Messages As Seen
=================================================
*//*
=================================================
✅ Mark Messages As Seen (Better Version)
=================================================
*/router.put("/messages/seen/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "UserId required",
      });
    }

    await Message.updateMany(
      {
        roomId,
        sender: { $ne: userId },
        seenBy: { $ne: userId },
      },
      {
        $addToSet: { seenBy: userId },
      }
    );

    res.json({
      success: true,
      message: "Marked as seen",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;