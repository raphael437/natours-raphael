const mongoose = require('mongoose');
const validator = require('validator');
const Tour = require('./tourModel');
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      require: [true, 'there is must be a review'],
    },
    rating: {
      type: Number,
      default: 4,
      min: [1, 'rating must be at least 1'],
      max: [5, 'rating must be at max 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        require: [true, 'a review must belong to a tour'],
      },
    ],
    user: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        require: [true, 'a review must belong to a user'],
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calAverageRating = async function (tourId) {
  //in static method this points to the model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, //selecting the tour that we want to aggregate for
    },
    {
      $group: {
        _id: '$tour', //grouping the reviews by thier tour,
        nRating: { $sum: 1 }, //ading 1 for each review taht matches the current tour
        avgRating: { $avg: '$rating' }, //calculate the avg of the rating for reviews that matches the current tour
      },
    },
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingAverage: stats[0].avgRating,
      ratingQuantity: stats[0].nRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingAverage: 4.5,
      ratingQuantity: 0,
    });
  }
};
reviewSchema.post('save', function () {
  //this points to the current document, constructor points to the model that created that document because static method is called on the model
  this.constructor.calAverageRating(this.tour);
});
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.model.findOne(this.getQuery()); //excute the query for the hanlder function
  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calAverageRating(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
