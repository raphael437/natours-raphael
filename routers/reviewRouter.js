const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const router = express.Router({ mergeParams: true });

router.use(authController.protect);
router
  .route('/')
  .get(reviewController.getAllReview)
  .post(
    authController.restrictTO('user'),
    reviewController.setTourUsersId,
    reviewController.createNewReview,
  );
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTO('admin', 'user'),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTO('admin', 'user'),
    reviewController.deleteReview,
  );
module.exports = router;
