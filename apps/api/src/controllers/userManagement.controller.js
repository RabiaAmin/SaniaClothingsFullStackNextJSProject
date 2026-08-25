const User = require('../models/user.model');
const Role = require('../models/role.model');
const asyncHandler = require('../utils/asyncHandler');
const { generateTemporaryPassword } = require('../services/password.service');
const { canGrantPermissions } = require('../services/permission.service');

function serializeManagedUser(user) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    aboutMe: user.aboutMe,
    avatar: user.avatar,
    role: user.role,
    isActive: user.isActive !== false,
    mustChangePassword: user.mustChangePassword === true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function canManageRole(user, role) {
  return !role || canGrantPermissions(user, role.permissions);
}

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-resetPasswordToken -resetPasswordExpire')
    .populate({ path: 'role', populate: { path: 'permissions' } })
    .sort({ username: 1 });
  res.status(200).json({ success: true, users });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { username, email, phone, aboutMe, roleId } = req.body;
  if (!username || !email || !phone || !roleId) {
    return res.status(400).json({
      success: false,
      message: 'Username, email, phone, and role are required',
    });
  }

  const role = await Role.findById(roleId).populate('permissions');
  if (!role) return res.status(400).json({ success: false, message: 'Role not found' });
  if (role.isActive === false) {
    return res.status(400).json({ success: false, message: 'Inactive roles cannot be assigned' });
  }
  if (!canManageRole(req.user, role)) {
    return res.status(403).json({
      success: false,
      message: 'You cannot assign a role with permissions beyond your own access',
    });
  }

  const temporaryPassword = generateTemporaryPassword();
  const user = await User.create({
    username,
    email,
    phone,
    aboutMe: aboutMe?.trim() || 'Internal user account',
    avatar: { public_id: '', url: '' },
    password: temporaryPassword,
    role: role._id,
    isActive: true,
    mustChangePassword: true,
  });
  await user.populate({ path: 'role', populate: { path: 'permissions' } });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: serializeManagedUser(user),
    temporaryPassword,
  });
});

exports.updateUserAccess = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const currentRole = user.role ? await Role.findById(user.role).populate('permissions') : null;
  let nextRole = currentRole;
  if (!canManageRole(req.user, currentRole)) {
    return res.status(403).json({
      success: false,
      message: 'You cannot manage a user whose role exceeds your own access',
    });
  }
  if (req.body.roleId !== undefined) {
    nextRole =
      req.body.roleId === null
        ? null
        : await Role.findById(req.body.roleId).populate('permissions');
    if (req.body.roleId !== null && !nextRole) {
      return res.status(400).json({ success: false, message: 'Role not found' });
    }
    if (nextRole?.isActive === false) {
      return res.status(400).json({ success: false, message: 'Inactive roles cannot be assigned' });
    }
    if (!canManageRole(req.user, nextRole)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign a role with permissions beyond your own access',
      });
    }
  }

  if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'User status must be a boolean' });
  }
  const nextActive = req.body.isActive === undefined ? user.isActive : req.body.isActive;
  if (currentRole?.slug === 'admin' && (nextRole?.slug !== 'admin' || nextActive === false)) {
    return res.status(400).json({
      success: false,
      message: 'Admin accounts cannot be deactivated or assigned to another role',
    });
  }

  if (req.body.roleId !== undefined) user.role = nextRole?._id ?? null;
  user.isActive = nextActive;
  await user.save({ validateBeforeSave: false });
  await user.populate({ path: 'role', populate: { path: 'permissions' } });

  res.status(200).json({ success: true, message: 'User access updated successfully', user });
});
