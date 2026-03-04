// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver is required']
  },
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    index: true
  },
  message: {
    type: String,
    required: [true, 'Message content is required']
  },
  file: {
    name: String,
    type: String,
    data: String,
    size: Number
  },
  seenBy: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }
],
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ roomId: 1, timestamp: -1 });
messageSchema.index({ sender: 1, receiver: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);