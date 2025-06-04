const Review = require('../models/reviewModel');
//const AppError = require('../utils/appError');
//const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
exports.setTourUsersId = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};
exports.getAllReview = factory.getAll(Review);
exports.createNewReview = factory.createNewOne(Review);
exports.getReview = factory.getOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
