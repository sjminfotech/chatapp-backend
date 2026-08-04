// models/AccessSession.js
const mongoose = require('mongoose');

const accessSessionSchema = new mongoose.Schema({
  visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiryTime: { type: Date, required: true }, // Current Time + 1 Hour
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('AccessSession', accessSessionSchema);