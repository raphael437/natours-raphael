const mongoose = require('mongoose');
const Tour = require('./tourModel');
const User = require('./userModel');
const { type } = require('os');
const { ref } = require('process');
const { types } = require('util');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'booking must belong to a tour'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'booking must belong to a user'],
  },
  price: {
    type: Number,
    require: [true, 'booking must have a price.'],
  },
  createdAT: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});
bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
