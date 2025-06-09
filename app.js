const express = require('express');
const { json } = require('stream/consumers');

const path = require('path');

const app = express();
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
//const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/error.Controller');
const tourRouter = require('./routers/tourRouter');
const userRouter = require('./routers/userRouter');
const reviewRouter = require('./routers/reviewRouter');
const bookingRouter = require('./routers/bookingRouter');
const bookingController = require('./controllers/bookingController');
const mongoSanitize = require('./utils/mongoSan');
const { title } = require('process');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

//global middleware
// implement cors
app.use(cors());
app.options('*', cors());
//serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout,
);

//limit number of requests of an ip for a specific amount of time
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'tom mant requests from the same ip , please try again in an hour',
});
app.use('/api', limiter);
//tell Express to use extended parsing
app.use(express.urlencoded({ extended: true }));
app.set('query parser', 'extended');
//body parser ,read data from the body into req.body
app.use(express.json({ limit: '10kb' }));
//data senitization against nosql query injection
app.use(mongoSanitize); //data senitization against xss

//prevent parameter polution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);
app.use(compression());
app.use(cookieParser());

//test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.headers);
  next();
});

//routes
app.set('strict routing', true); // Optional

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
//app.use('/', viewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);
module.exports = app;
