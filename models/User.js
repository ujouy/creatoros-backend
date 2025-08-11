// models/User.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  subscriptionPlan: {
    type: String,
    enum: ['Essential', 'Pro', 'Lifetime', 'None'],
    default: 'None'
  },
  // --- ADD THIS NEW SECTION ---
  google: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Number
  },
  // --------------------------
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;