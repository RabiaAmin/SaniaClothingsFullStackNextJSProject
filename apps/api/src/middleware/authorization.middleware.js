const { hasAnyPermission } = require('../services/permission.service');

const authorize =
  (...requiredPermissions) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (req.user.mustChangePassword === true) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password change required before accessing this resource',
      });
    }

    if (!requiredPermissions.length || hasAnyPermission(req.user, requiredPermissions)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action',
    });
  };

module.exports = { authorize };
