const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id).populate({
    path: 'role',
    populate: { path: 'permissions' },
  });

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({ success: false, message: 'User account is inactive' });
  }

  if (req.user.role?.isActive === false) {
    return res.status(403).json({ success: false, message: 'Assigned role is inactive' });
  }

  next();
});

const requirePasswordChangeComplete = (req, res, next) => {
  if (req.user?.mustChangePassword === true) {
    return res.status(403).json({
      success: false,
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Password change required before accessing this resource',
    });
  }
  next();
};

module.exports = { protect, requirePasswordChangeComplete };
