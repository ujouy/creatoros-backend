const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  subscriptionPlan: {
    type: String,
    default: 'None',
    enum: ['None', 'Basic', 'Pro', 'Enterprise']
  },
  google: {
    accessToken: {
      type: String,
      default: null
    },
    refreshToken: {
      type: String,
      default: null
    },
    profile: {
      id: String,
      email: String,
      name: String,
      picture: String
    },
    connectedAt: {
      type: Date,
      default: null
    }
  },
  x: {
    accessToken: {
      type: String,
      default: null
    },
    refreshToken: {
      type: String,
      default: null
    },
    profile: {
      id: String,
      username: String,
      name: String,
      profileImage: String
    },
    connectedAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if Google is connected
userSchema.methods.isGoogleConnected = function() {
  return !!(this.google.accessToken && this.google.profile.id);
};

// Check if X is connected
userSchema.methods.isXConnected = function() {
  return !!(this.x.accessToken && this.x.profile.id);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.google.accessToken;
  delete userObject.google.refreshToken;
  delete userObject.x.accessToken;
  delete userObject.x.refreshToken;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);