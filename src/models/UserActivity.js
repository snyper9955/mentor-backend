const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  // Optional fields for more detailed tracking
  sessionStart: Date,
  sessionEnd: Date,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index for efficient queries
userActivitySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('UserActivity', userActivitySchema);