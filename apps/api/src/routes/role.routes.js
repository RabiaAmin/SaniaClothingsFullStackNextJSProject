const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const roleController = require('../controllers/role.controller');
const permissionController = require('../controllers/permission.controller');

const router = express.Router();

router.get('/', protect, authorize('role.read'), roleController.getRoles);
router.post('/', protect, authorize('role.create'), roleController.createRole);
router.get('/permissions', protect, authorize('role.read'), permissionController.getPermissions);
router.post(
  '/permissions',
  protect,
  authorize('role.create'),
  permissionController.createPermission
);
router.put(
  '/permissions/:id',
  protect,
  authorize('role.update'),
  permissionController.updatePermission
);
router.delete(
  '/permissions/:id',
  protect,
  authorize('role.delete'),
  permissionController.deletePermission
);
router.get('/:id/users', protect, authorize('role.read'), roleController.getRoleUsers);
router.get('/:id', protect, authorize('role.read'), roleController.getRole);
router.put('/:id', protect, authorize('role.update'), roleController.updateRole);
router.delete('/:id', protect, authorize('role.delete'), roleController.deleteRole);

module.exports = router;
