const Meeting = require("../models/Meeting");

exports.createMeeting = async (req, res) => {
  try {
    const { student, scheduledAt, googleMeetLink } = req.body;

    // req.user comes from protect middleware
    const mentorId = req.user._id;

    const meeting = await Meeting.create({
      mentor: mentorId,
      student,
      googleMeetLink,
      scheduledAt,
      status: "scheduled",
    });

    res.status(201).json({
      message: "Meeting created successfully",
      meeting,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};





exports.getMeetings = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "mentor") {
      filter.mentor = req.user._id;
    }

    if (req.user.role === "student") {
      filter.student = req.user._id;
    }

    const meetings = await Meeting.find(filter)
      .populate("mentor", "email -_id")
      .populate("student", "email -_id")
      .sort({ scheduledAt: -1 });

    res.status(200).json(meetings);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.MeetingRequestingForMentor = async (req, res) => {
  try {
    const { mentor, scheduledAt, googleMeetLink } = req.body;

    // req.user comes from protect middleware
    const studentId = req.user._id;

    const meeting = await Meeting.create({
      mentor,
      student: studentId,
      googleMeetLink,
      scheduledAt,
      status: "scheduled",
    });

    res.status(201).json({
      message: "Meeting created successfully",
      meeting,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


