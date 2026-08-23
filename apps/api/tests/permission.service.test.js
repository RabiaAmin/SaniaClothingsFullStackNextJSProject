const test = require('node:test');
const assert = require('node:assert/strict');
const {
  permissionMatches,
  hasPermission,
  hasAnyPermission,
} = require('../src/services/permission.service');
const { authorize } = require('../src/middleware/authorization.middleware');

test('permission matching supports full, resource wildcard, and exact grants', () => {
  assert.equal(permissionMatches('*', 'invoice.delete'), true);
  assert.equal(permissionMatches('invoice.*', 'invoice.create'), true);
  assert.equal(permissionMatches('invoice.read', 'invoice.read'), true);
  assert.equal(permissionMatches('invoice.read', 'invoice.update'), false);
  assert.equal(permissionMatches('client.*', 'invoice.read'), false);
});

test('permission checks accept populated permission documents', () => {
  const user = {
    role: {
      permissions: [{ key: 'production_entry.read_own' }, { key: 'production_entry.create' }],
    },
  };

  assert.equal(hasPermission(user, 'production_entry.read_own'), true);
  assert.equal(hasPermission(user, 'production_entry.read_all'), false);
  assert.equal(
    hasAnyPermission(user, ['production_entry.approve', 'production_entry.create']),
    true
  );
});

test('authorization middleware returns 403 when a user lacks permission', () => {
  const middleware = authorize('invoice.read');
  const req = { user: { role: { permissions: [{ key: 'production_entry.read_own' }] } } };
  let responseStatus;
  let responseBody;
  let calledNext = false;
  const res = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  middleware(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(responseStatus, 403);
  assert.equal(responseBody.success, false);
});

test('authorization middleware accepts invoice manager wildcard access', () => {
  const middleware = authorize('invoice.update');
  const req = { user: { role: { permissions: [{ key: 'invoice.*' }] } } };
  let calledNext = false;

  middleware(req, {}, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
});

test('inactive roles do not grant permissions', () => {
  const user = {
    role: { isActive: false, permissions: [{ key: '*' }] },
  };

  assert.equal(hasPermission(user, 'role.update'), false);
});

test('authorization middleware blocks normal APIs until a temporary password is changed', () => {
  const middleware = authorize('production_order.read');
  const req = {
    user: {
      mustChangePassword: true,
      role: { permissions: [{ key: 'production_order.read' }] },
    },
  };
  let responseStatus;
  let responseBody;
  let calledNext = false;
  const res = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  middleware(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(responseStatus, 403);
  assert.equal(responseBody.code, 'PASSWORD_CHANGE_REQUIRED');
});
