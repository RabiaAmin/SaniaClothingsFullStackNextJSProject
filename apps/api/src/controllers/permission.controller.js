const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
const asyncHandler = require('../utils/asyncHandler');

exports.getPermissions = asyncHandler(async (req, res) => {
  const permissions = await Permission.find().sort({ resource: 1, action: 1 });
  res.status(200).json({ success: true, permissions });
});

exports.createPermission = asyncHandler(async (req, res) => {
  const { key, resource, action, description } = req.body;
  if (!key || !resource || !action) {
    return res.status(400).json({
      success: false,
      message: 'Permission key, resource, and action are required',
    });
  }

  const permission = await Permission.create({
    key,
    resource,
    action,
    description,
    isSystem: false,
  });
  res.status(201).json({
    success: true,
    message: 'Permission created successfully',
    permission,
  });
});

exports.updatePermission = asyncHandler(async (req, res) => {
  const permission = await Permission.findById(req.params.id);
  if (!permission) {
    return res.status(404).json({ success: false, message: 'Permission not found' });
  }
  if (permission.isSystem) {
    return res
      .status(400)
      .json({ success: false, message: 'System permissions cannot be changed' });
  }

  for (const field of ['key', 'resource', 'action', 'description']) {
    if (req.body[field] !== undefined) permission[field] = req.body[field];
  }
  await permission.save();
  res.status(200).json({
    success: true,
    message: 'Permission updated successfully',
    permission,
  });
});

exports.deletePermission = asyncHandler(async (req, res) => {
  const permission = await Permission.findById(req.params.id);
  if (!permission) {
    return res.status(404).json({ success: false, message: 'Permission not found' });
  }
  if (permission.isSystem) {
    return res
      .status(400)
      .json({ success: false, message: 'System permissions cannot be deleted' });
  }

  const assignedRoles = await Role.countDocuments({ permissions: permission._id });
  if (assignedRoles > 0) {
    return res.status(409).json({
      success: false,
      message: 'Remove this permission from assigned roles before deleting it',
    });
  }

  await permission.deleteOne();
  res.status(200).json({ success: true, message: 'Permission deleted successfully' });
});
