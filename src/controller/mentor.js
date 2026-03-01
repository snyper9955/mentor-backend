const User = require("../models/User");

exports.getMentors = async (req, res) => {
  try {
    const mentors = await User.find({ role: "mentor" }).select(
      "name email _id"
    );

    res.status(200).json(mentors);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};