const UserActivity = require("../models/UserActivity");
const mongoose = require("mongoose");

// Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Save activity (single session entry)
exports.saveActivity = async (req, res) => {
  try {
    const { timeSpent } = req.body;

    // Input validation
    if (!timeSpent || typeof timeSpent !== 'number' || timeSpent <= 0) {
      return res.status(400).json({ 
        message: "Valid timeSpent is required (positive number)" 
      });
    }

    // Check if user exists in request (from auth middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const activity = await UserActivity.create({
      userId: req.user.id,
      timeSpent,
      date: new Date() // Ensure date is set
    });

    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error("Save activity error:", error);
    res.status(500).json({ 
      message: "Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get weekly activity
exports.getWeeklyActivity = async (req, res) => {
  try {
    // Check if user exists
    if (!req.user || !req.user.id || !isValidObjectId(req.user.id)) {
      return res.status(401).json({ message: "Valid user not authenticated" });
    }

    // Get date range for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const data = await UserActivity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: sevenDaysAgo } // Only last 7 days
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$date",
              timezone: "UTC" // Specify timezone
            },
          },
          totalTime: { $sum: "$timeSpent" },
          count: { $sum: 1 } // Number of sessions
        },
      },
      {
        $sort: { _id: 1 } // Sort by date ascending
      },
      {
        $project: {
          _id: 1,
          totalTime: 1,
          count: 1,
          averageTime: { $divide: ["$totalTime", "$count"] } // Average per session
        }
      }
    ]);

    // Fill in missing dates with zero values
    const filledData = fillMissingDates(data, 7);

    res.json({
      success: true,
      data: filledData
    });
  } catch (error) {
    console.error("Weekly activity error:", error);
    res.status(500).json({ 
      message: "Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to fill missing dates
const fillMissingDates = (data, days) => {
  const result = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const existing = data.find(item => item._id === dateStr);
    
    if (existing) {
      result.push(existing);
    } else {
      result.push({
        _id: dateStr,
        totalTime: 0,
        count: 0,
        averageTime: 0
      });
    }
  }
  
  return result;
};

// Update time (increment today's total)
exports.updateTime = async (req, res) => {
  try {
    const { seconds } = req.body;

    // Input validation
    if (!seconds || typeof seconds !== 'number' || seconds <= 0) {
      return res.status(400).json({ 
        message: "Valid seconds is required (positive number)" 
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Create date range for today (start and end of day)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find or create today's activity
    const activity = await UserActivity.findOneAndUpdate(
      { 
        userId: req.user.id,
        date: { $gte: startOfDay, $lte: endOfDay }
      },
      { 
        $inc: { timeSpent: seconds },
        $setOnInsert: { 
          userId: req.user.id,
          date: new Date()
        }
      },
      { 
        upsert: true, 
        new: true, // Return updated document
        setDefaultsOnInsert: true
      }
    );

    // Get updated total for today
    const todayTotal = await UserActivity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalTime: { $sum: "$timeSpent" }
        }
      }
    ]);

    res.json({ 
      success: true,
      totalTime: todayTotal[0]?.totalTime || activity.timeSpent,
      message: "Time updated successfully"
    });
  } catch (err) {
    console.error("Update time error:", err);
    res.status(500).json({ 
      message: "Error updating time",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get today's total time
exports.getTodayTime = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Create date range for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Aggregate all activities for today
    const result = await UserActivity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalTime: { $sum: "$timeSpent" },
          sessionCount: { $sum: 1 }
        }
      }
    ]);

    const totalTime = result.length > 0 ? result[0].totalTime : 0;
    const sessionCount = result.length > 0 ? result[0].sessionCount : 0;

    res.json({
      success: true,
      totalTime,
      sessionCount,
      date: startOfDay.toISOString().split('T')[0]
    });
  } catch (err) {
    console.error("Get today time error:", err);
    res.status(500).json({ 
      message: "Error fetching time",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Optional: Get activity for a specific date range
exports.getActivityByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const activities = await UserActivity.find({
      userId: req.user.id,
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error("Date range error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


exports.getDailyReport = async (req, res) => {
  try {
    const userId = req.user.id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const data = await UserActivity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date"
            }
          },
          totalTime: { $sum: "$timeSpent" },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      type: "daily",
      data
    });

  } catch (error) {
    res.status(500).json({ message: "Daily report error" });
  }
};



exports.getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user.id;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const data = await UserActivity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: oneYearAgo }
        }
      },
      {
        $group: {
          _id: {
  year: { $year: "$date" },
  month: { $month: "$date" }
},
          totalTime: { $sum: "$timeSpent" },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      type: "monthly",
      data
    });

  } catch (error) {
    res.status(500).json({ message: "Monthly report error" });
  }
};
exports.getWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.id;

    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 28);

    const data = await UserActivity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: oneMonthAgo }
        }
      },
      {
        $group: {
          _id: { $week: "$date" },
          totalTime: { $sum: "$timeSpent" },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      type: "weekly",
      data
    });

  } catch (error) {
    res.status(500).json({ message: "Weekly report error" });
  }
};

exports.getYearlyReport = async (req, res) => {
  try {
    const userId = req.user.id;

    const data = await UserActivity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" }
          },
          totalTime: { $sum: "$timeSpent" },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    res.json({
      success: true,
      type: "yearly",
      data
    });

  } catch (error) {
    res.status(500).json({ message: "Yearly report error" });
  }
};





// Get Day Wise Report (All Previous Days + Avg + Peak)
exports.getDayWiseReport = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const data = await UserActivity.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $type: "date" } // exclude docs with invalid dates
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: "UTC"
            }
          },
          totalTime: { $sum: "$timeSpent" },
          sessions: { $sum: 1 }
        }
      },
      {
        $addFields: {
          averageTime: {
            $cond: [
              { $eq: ["$sessions", 0] },
              0,
              { $divide: ["$totalTime", "$sessions"] }
            ]
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Calculate overall stats
    let overallTotal = 0;
    let overallSessions = 0;
    let peakDay = null;
    let maxTime = 0;

    data.forEach(day => {
      overallTotal += day.totalTime;
      overallSessions += day.sessions;

      if (day.totalTime > maxTime) {
        maxTime = day.totalTime;
        peakDay = day._id;
      }
    });

    const overallAverage = overallSessions > 0
      ? overallTotal / overallSessions
      : 0;

    res.json({
      success: true,
      type: "day-wise",
      summary: {
        overallTotalTime: overallTotal,
        overallSessions: overallSessions,
        overallAverageTime: overallAverage,
        peakDay: peakDay,
        peakDayTime: maxTime
      },
      data
    });

  } catch (error) {
    console.error("Day wise report error:", error);
    res.status(500).json({ message: "Day wise report error" });
  }
};