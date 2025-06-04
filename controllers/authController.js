const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  //remove the password from the output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};
exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createAndSendToken(newUser, 201, res);
});
exports.logIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1 check if the email and password exists
  if (!email || !password) {
    return next(new AppError('please provide the email and the password', 400));
  }
  //2 check if the user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  console.log(user);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('incorrct password or email', 401));
  }
  //3 if everything is ok send token to the client
  createAndSendToken(user, 200, res);
});
exports.protect = catchAsync(async (req, res, next) => {
  //1 getting the token and checking if it is value exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('you are not logged in,please login to get access ', 401),
    );
  }
  //2 verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3 check if the user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'the user belonging to this token does no longer exist',
        401,
      ),
    );
  }
  //4 check if the user change the password after the token was created
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('user change the password please login again', 401),
    );
  }
  //if all this is valid then get access to the protected router
  req.user = currentUser;
  next();
});
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
exports.restrictTO = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you do not have premission to perform this action', 403),
      );
    }
    next();
  };
};
exports.forgetPassword = catchAsync(async (req, res, next) => {
  //1 get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('there is no user with that email', 404));
  }
  //2 generate randome reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    //3 send it to the user email
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetpassword/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'reset token sent to email',
    });
  } catch (err) {
    user.PasswordResetToken = undefined;
    user.PasswordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('there was an error sending the email', 500));
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1 encrypt the resettoken that has been sent with the url and compare it with the ones in the database to get the user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    PasswordResetToken: hashedToken,
    PasswordResetExpires: { $gt: Date.now() },
  });
  //2 if the token is not expired, and there is a user ,set the new password
  if (!user) {
    return next(new AppError('token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.PasswordResetToken = undefined;
  user.PasswordResetExpires = undefined;
  await user.save();
  //3 update the changedPasswordAt property for the user
  //4 log the user in , send JWT
  createAndSendToken(user, 200, res);
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1 get user from the collection
  const user = await User.findById(req.user.id).select('+password');

  //2 check if the post request has the current password
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('your current password is wrong', 401));
  }
  //3 update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4 login user in, send the jwt now loged with the new password
  createAndSendToken(user, 200, res);
});
