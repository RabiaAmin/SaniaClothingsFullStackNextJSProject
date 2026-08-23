export function permissionMatches(grantedPermission, requiredPermission) {
  const granted =
    typeof grantedPermission === 'string' ? grantedPermission : grantedPermission?.key;
  const required =
    typeof requiredPermission === 'string' ? requiredPermission : requiredPermission?.key;

  if (!granted || !required) return false;
  if (granted === '*' || granted === required) return true;

  const separator = granted.indexOf('.');
  if (separator === -1 || granted.slice(separator + 1) !== '*') return false;
  return required.startsWith(`${granted.slice(0, separator)}.`);
}

export function hasPermission(permissions, requiredPermission) {
  return (permissions || []).some((permission) =>
    permissionMatches(permission, requiredPermission)
  );
}

export function hasAnyPermission(permissions, requiredPermissions) {
  return requiredPermissions.some((permission) => hasPermission(permissions, permission));
}
