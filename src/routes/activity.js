const express = require("express");
const router = express.Router();
const { saveActivity, getWeeklyActivity,updateTime,getTodayTime, getYearlyReport, getMonthlyReport, getWeeklyReport, getDailyReport, getDayWiseReport  } = require("../controller/activityController");
const { protect } = require("../middleware/authMiddleware");

router.post("/save", protect, saveActivity);
router.get("/weekly", protect, getWeeklyActivity);
router.post("/update", protect, updateTime);
router.get("/today", protect, getTodayTime);
router.get("/report/daily", protect, getDailyReport);
router.get("/report/weekly", protect, getWeeklyReport);
router.get("/report/monthly", protect, getMonthlyReport);
router.get("/report/yearly", protect, getYearlyReport);
router.get("/day-wise-report", protect, getDayWiseReport);


module.exports = router;