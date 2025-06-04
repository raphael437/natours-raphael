const exprees = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const router = exprees.Router();

//create diffrent routes
router.post('/signup', authController.signUp);
router.post('/login', authController.logIn);
router.get('/logout', authController.logout);

router.post('/forgetpassword', authController.forgetPassword);
router.patch('/resetpassword/:token', authController.resetPassword);

router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);
router.get('/Me', userController.getMe, userController.getUser);

router.use(authController.restrictTO('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);
module.exports = router;
