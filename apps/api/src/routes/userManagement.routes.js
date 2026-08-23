const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const {
  createUser,
  getUsers,
  updateUserAccess,
} = require('../controllers/userManagement.controller');

const router = express.Router();

router.get('/', protect, authorize('user.read'), getUsers);
router.post('/', protect, authorize('user.create'), createUser);
router.put('/:id/access', protect, authorize('user.update'), updateUserAccess);

module.exports = router;
