const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');

async function resolvePermissions(permissionIds) {
  const uniqueIds = [...new Set(permissionIds || [])];
  const permissions = await Permission.find({ _id: { $in: uniqueIds } });

  if (permissions.length !== uniqueIds.length) {
    return null;
  }

  return permissions;
}

exports.getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().populate('permissions').sort({ isSystem: -1, name: 1 });
  const assignmentCounts = await User.aggregate([
    { $match: { role: { $ne: null } } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  const countByRole = new Map(assignmentCounts.map(({ _id, count }) => [String(_id), count]));
  const rolesWithCounts = roles.map((role) => ({
    ...role.toObject(),
    assignedUserCount: countByRole.get(String(role._id)) ?? 0,
  }));
  res.status(200).json({ success: true, roles: rolesWithCounts });
});

exports.getRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id).populate('permissions');
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
  res.status(200).json({ success: true, role });
});

exports.getRoleUsers = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id).select('name slug');
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

  const users = await User.find({ role: role._id })
    .select('username email isActive createdAt')
    .sort({ username: 1 });
  res.status(200).json({ success: true, role, users });
});

exports.createRole = asyncHandler(async (req, res) => {
  const { name, slug, description, permissionIds = [] } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ success: false, message: 'Role name and slug are required' });
  }

  const permissions = await resolvePermissions(permissionIds);
  if (!permissions) {
    return res.status(400).json({ success: false, message: 'One or more permissions are invalid' });
  }

  const role = await Role.create({
    name,
    slug,
    description,
    permissions: permissions.map((permission) => permission._id),
    isSystem: false,
  });
  await role.populate('permissions');

  res.status(201).json({ success: true, message: 'Role created successfully', role });
});

exports.updateRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

  if (role.slug === 'admin') {
    return res.status(400).json({
      success: false,
      message: 'The Admin role is protected and always retains full access',
    });
  }

  if (req.body.name !== undefined) role.name = req.body.name;
  if (req.body.description !== undefined) role.description = req.body.description;

  if (req.body.isActive !== undefined) {
    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Role status must be a boolean' });
    }
    if (role.isSystem && req.body.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'System roles must remain active',
      });
    }
    if (req.body.isActive === false && role.isActive !== false) {
      const assignedUsers = await User.countDocuments({ role: role._id });
      if (assignedUsers > 0) {
        return res.status(409).json({
          success: false,
          message: 'Reassign users before deactivating this role',
        });
      }
    }
    role.isActive = req.body.isActive;
  }

  if (req.body.permissionIds !== undefined) {
    const permissions = await resolvePermissions(req.body.permissionIds);
    if (!permissions) {
      return res
        .status(400)
        .json({ success: false, message: 'One or more permissions are invalid' });
    }
    role.permissions = permissions.map((permission) => permission._id);
  }

  await role.save();
  await role.populate('permissions');
  res.status(200).json({ success: true, message: 'Role updated successfully', role });
});

exports.deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
  if (role.isSystem) {
    return res.status(400).json({ success: false, message: 'System roles cannot be deleted' });
  }

  const assignedUsers = await User.countDocuments({ role: role._id });
  if (assignedUsers > 0) {
    return res.status(409).json({
      success: false,
      message: 'Reassign users before deleting this role',
    });
  }

  await role.deleteOne();
  res.status(200).json({ success: true, message: 'Role deleted successfully' });
});
