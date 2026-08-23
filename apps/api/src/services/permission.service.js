function permissionKey(permission) {
  if (typeof permission === 'string') return permission;
  return permission?.key || '';
}

function permissionMatches(grantedPermission, requiredPermission) {
  const granted = permissionKey(grantedPermission);
  const required = permissionKey(requiredPermission);

  if (!granted || !required) return false;
  if (granted === '*' || granted === required) return true;

  const separator = granted.indexOf('.');
  if (separator === -1 || granted.slice(separator + 1) !== '*') return false;

  return required.startsWith(`${granted.slice(0, separator)}.`);
}

function getPermissionKeys(user) {
  if (user?.role?.isActive === false) return [];
  const permissions = user?.role?.permissions || [];
  return permissions.map(permissionKey).filter(Boolean);
}

function hasPermission(user, requiredPermission) {
  return getPermissionKeys(user).some((granted) => permissionMatches(granted, requiredPermission));
}

function hasAnyPermission(user, requiredPermissions) {
  return requiredPermissions.some((permission) => hasPermission(user, permission));
}

module.exports = {
  permissionMatches,
  getPermissionKeys,
  hasPermission,
  hasAnyPermission,
};
