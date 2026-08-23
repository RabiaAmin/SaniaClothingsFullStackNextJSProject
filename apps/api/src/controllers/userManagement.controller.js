const User = require('../models/user.model');
const Role = require('../models/role.model');
const asyncHandler = require('../utils/asyncHandler');
const { generateTemporaryPassword } = require('../services/password.service');

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

async function wouldRemoveLastAdmin(user, nextRole, nextActive) {
  const currentRole = await Role.findById(user.role);
  if (currentRole?.slug !== 'admin') return false;
  if (nextRole?.slug === 'admin' && nextActive !== false) return false;

  const adminRole = await Role.findOne({ slug: 'admin' });
  if (!adminRole) return true;
  const otherAdmins = await User.countDocuments({
    _id: { $ne: user._id },
    role: adminRole._id,
    isActive: { $ne: false },
  });
  return otherAdmins === 0;
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

  const role = await Role.findById(roleId);
  if (!role) return res.status(400).json({ success: false, message: 'Role not found' });
  if (role.isActive === false) {
    return res.status(400).json({ success: false, message: 'Inactive roles cannot be assigned' });
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

  let nextRole = user.role ? await Role.findById(user.role) : null;
  if (req.body.roleId !== undefined) {
    nextRole = req.body.roleId === null ? null : await Role.findById(req.body.roleId);
    if (req.body.roleId !== null && !nextRole) {
      return res.status(400).json({ success: false, message: 'Role not found' });
    }
    if (nextRole?.isActive === false) {
      return res.status(400).json({ success: false, message: 'Inactive roles cannot be assigned' });
    }
  }

  if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'User status must be a boolean' });
  }
  const nextActive = req.body.isActive === undefined ? user.isActive : req.body.isActive;
  if (await wouldRemoveLastAdmin(user, nextRole, nextActive)) {
    return res.status(409).json({
      success: false,
      message: 'At least one active Admin account is required',
    });
  }

  if (req.body.roleId !== undefined) user.role = nextRole?._id ?? null;
  user.isActive = nextActive;
  await user.save({ validateBeforeSave: false });
  await user.populate({ path: 'role', populate: { path: 'permissions' } });

  res.status(200).json({ success: true, message: 'User access updated successfully', user });
});
