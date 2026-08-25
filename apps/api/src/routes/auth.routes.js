const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getUser,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/auth.controller');
const { protect, requirePasswordChangeComplete } = require('../middleware/auth.middleware');
const { singleAvatar } = require('../middleware/upload.middleware');

router.post('/register', singleAvatar, register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/getUser', protect, getUser);
router.put('/update/profile', protect, requirePasswordChangeComplete, singleAvatar, updateProfile);
router.put('/update/password', protect, updatePassword);
router.post('/password/forgot', forgotPassword);
router.put('/password/reset/:token', resetPassword);

module.exports = router;
