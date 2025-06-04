const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { parse } = require('qs');
const { type } = require('os');
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'the name is required'],
    minlength: [3, 'the name must be at least 3 characters'],
  },
  email: {
    type: String,
    required: [true, 'the email is required'],
    unique: [true, 'the email must be unique'],
    lowercase: true,
    validate: [validator.isEmail, 'the email must be valid '],
  },
  photo: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'the password is required'],
    minlength: [8, 'the password must be at least 8 characters'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'please confirm your password'],
    minlength: [8, 'the confirmed password must be at least 8 characters'],
    validate: [
      //only works with save and create and not update so we will update by save
      function (el) {
        return el === this.password;
      },
      'passwords are not the same',
    ],
  },
  changedPasswordAt: Date,
  PasswordResetToken: String,
  PasswordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.changedPasswordAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  sentPasssword,
  userPassword,
) {
  return await bcrypt.compare(sentPasssword, userPassword);
};
userSchema.methods.changedPasswordAfter = function (JwtTimestamp) {
  if (this.changedPasswordAt) {
    const changedTimestamp = parseInt(
      this.changedPasswordAt.getTime() / 1000,
      10,
    );
    return JwtTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.PasswordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.PasswordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
