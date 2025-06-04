const mongoose = require('mongoose');
const slugify = require('slugify');
const { promises } = require('nodemailer/lib/xoauth2');
//const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, ' the name is required'],
      unique: true,
      trim: true,
      maxlength: [40, 'tour name should not be more than 40 characters'],
      minlength: [5, 'tour name should not be less than 5 characters'],
      // validate: [validator.isAlpha, 'tour name should only be string'],
    },
    slug: String,
    duration: {
      type: Number,
      require: [true, 'a tour must has a duration'],
    },
    maxGroup: {
      type: Number,
      require: [true, 'a tour mast has a group size'],
    },
    difficulty: {
      type: String,
      require: [true, 'a tour must has a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'difficulty should only be easy,medium,difficult',
      },
    },
    ratingAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above or equal to 1.0'],
      max: [5, 'Rating must be less than or equal to 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      require: [true, 'the price is required'],
    },
    priceDiscount: {
      type: Number,
      validate: [
        function (val) {
          return val < this.price;
        },
        'discount should be lower than price',
      ],
    },
    summary: {
      type: String,
      trim: true,
      require: [true, 'a tour must has a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      require: [true, 'a tour must has an image cover'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    secertTour: {
      type: Boolean,
      default: false,
    },
    startDates: [Date],
    startLocation: {
      //geojson data format in order to specify geo spatial data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      addresse: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        addresse: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
tourSchema.index({ startLocation: '2dsphere' });
tourSchema.index({ price: 1, ratingAverage: -1 });
tourSchema.index({ slug: 1 });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
//document middleware
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//query middleware

tourSchema.pre(/^find/, function (next) {
  this.find({ secertTour: { $ne: true } });
  this.start = Date.now();
  next();
});
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-_v -passwordChangedAt',
  });
  next();
});
tourSchema.post(/^find/, function (docs, next) {
  console.log(`query took ${Date.now() - this.start}`);
  next();
});

//aggrigation middleware
/*
tourSchema.pre('aggregate', function (next) {
  if (!this.pipeline().includes($geoNear))
    //first pipeline is geonear
    this.pipeline().unshift({ $match: { secertTour: { $ne: true } } });
  console.log(this.pipeline());
  next();
});
*/
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
