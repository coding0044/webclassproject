const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    resetOtpHash: {
      type: String,
      select: false
    },
    resetOtpExpiresAt: {
      type: Date,
      select: false
    },
    resetOtpSentAt: {
      type: Date,
      select: false
    },
    resetOtpVerifiedTokenHash: {
      type: String,
      select: false
    },
    resetOtpAttempts: {
      type: Number,
      default: 0,
      select: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
