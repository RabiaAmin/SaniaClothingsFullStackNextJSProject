const Notification = require('../models/notification.model');
const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
const User = require('../models/user.model');

function permissionCandidates(requiredPermission) {
  const separator = requiredPermission.indexOf('.');
  if (separator === -1) return [requiredPermission, '*'];
  return [requiredPermission, `${requiredPermission.slice(0, separator)}.*`, '*'];
}

function permissionCandidatesForAny(requiredPermissions) {
  return [...new Set(requiredPermissions.flatMap(permissionCandidates))];
}

async function findRecipientIdsForAnyPermission(requiredPermissions, options = {}) {
  const permissionIds = await Permission.find({
    key: { $in: permissionCandidatesForAny(requiredPermissions) },
  })
    .session(options.session ?? null)
    .distinct('_id');
  if (permissionIds.length === 0) return [];

  const roleIds = await Role.find({
    isActive: { $ne: false },
    permissions: { $in: permissionIds },
  })
    .session(options.session ?? null)
    .distinct('_id');
  if (roleIds.length === 0) return [];

  const excludedIds = options.excludeUserIds ?? [];
  const filter = { role: { $in: roleIds }, isActive: { $ne: false } };
  if (excludedIds.length) filter._id = { $nin: excludedIds };
  return User.find(filter)
    .session(options.session ?? null)
    .distinct('_id');
}

function findRecipientIdsForPermission(requiredPermission, options = {}) {
  return findRecipientIdsForAnyPermission([requiredPermission], options);
}

async function createNotificationsForUsers({ recipientIds, session, ...notification }) {
  const uniqueRecipientIds = [...new Set(recipientIds.map(String))];
  if (uniqueRecipientIds.length === 0) return [];
  const documents = uniqueRecipientIds.map((recipient) => ({ ...notification, recipient }));
  return Notification.insertMany(documents, { session });
}

async function createNotificationsForPermission({
  permission,
  excludeUserIds = [],
  session,
  ...notification
}) {
  const recipientIds = await findRecipientIdsForPermission(permission, {
    excludeUserIds,
    session,
  });
  return createNotificationsForUsers({ recipientIds, session, ...notification });
}

async function createNotificationsForAnyPermission({
  permissions,
  excludeUserIds = [],
  session,
  ...notification
}) {
  const recipientIds = await findRecipientIdsForAnyPermission(permissions, {
    excludeUserIds,
    session,
  });
  return createNotificationsForUsers({ recipientIds, session, ...notification });
}

module.exports = {
  permissionCandidates,
  permissionCandidatesForAny,
  findRecipientIdsForAnyPermission,
  findRecipientIdsForPermission,
  createNotificationsForUsers,
  createNotificationsForPermission,
  createNotificationsForAnyPermission,
};
