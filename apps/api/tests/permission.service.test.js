const test = require('node:test');
const assert = require('node:assert/strict');
const {
  permissionMatches,
  hasPermission,
  hasAnyPermission,
} = require('../src/services/permission.service');
const { authorize } = require('../src/middleware/authorization.middleware');
const { PERMISSIONS, ROLE_DEFINITIONS } = require('../src/services/rbac.service');

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

test('worker production-order access is read-only', () => {
  const user = { role: { permissions: [{ key: 'production_order.read' }] } };
  assert.equal(hasPermission(user, 'production_order.read'), true);
  assert.equal(hasPermission(user, 'production_order.create'), false);
  assert.equal(hasPermission(user, 'production_order.update'), false);
  assert.equal(hasPermission(user, 'production_order.delete'), false);
});

test('production managers can manage orders while invoice managers cannot', () => {
  const productionManager = {
    role: {
      permissions: [
        { key: 'production_order.create' },
        { key: 'production_order.read' },
        { key: 'production_order.update' },
        { key: 'production_order.delete' },
      ],
    },
  };
  const invoiceManager = { role: { permissions: [{ key: 'invoice.*' }] } };

  assert.equal(hasPermission(productionManager, 'production_order.create'), true);
  assert.equal(hasPermission(productionManager, 'production_order.update'), true);
  assert.equal(hasPermission(productionManager, 'production_order.delete'), true);
  assert.equal(hasPermission(invoiceManager, 'production_order.read'), false);
  assert.equal(hasPermission(invoiceManager, 'production_order.create'), false);
});

test('worker entry permissions exclude review while production managers can review all entries', () => {
  const worker = {
    role: {
      permissions: [
        { key: 'production_entry.create' },
        { key: 'production_entry.read_own' },
        { key: 'production_entry.update_own' },
      ],
    },
  };
  const productionManager = {
    role: {
      permissions: [
        { key: 'production_entry.read_all' },
        { key: 'production_entry.approve' },
        { key: 'production_entry.reject' },
      ],
    },
  };

  assert.equal(hasPermission(worker, 'production_entry.create'), true);
  assert.equal(hasPermission(worker, 'production_entry.read_all'), false);
  assert.equal(hasPermission(worker, 'production_entry.approve'), false);
  assert.equal(hasPermission(productionManager, 'production_entry.read_all'), true);
  assert.equal(hasPermission(productionManager, 'production_entry.approve'), true);
  assert.equal(hasPermission(productionManager, 'production_entry.reject'), true);
});

test('payroll permissions separate worker earnings from overall payroll', () => {
  const worker = { role: { permissions: [{ key: 'payroll.read_own' }] } };
  const productionManager = { role: { permissions: [{ key: 'payroll.read_all' }] } };
  const invoiceManager = { role: { permissions: [{ key: 'invoice.*' }] } };

  assert.equal(hasPermission(worker, 'payroll.read_own'), true);
  assert.equal(hasPermission(worker, 'payroll.read_all'), false);
  assert.equal(hasPermission(productionManager, 'payroll.read_all'), true);
  assert.equal(hasPermission(invoiceManager, 'payroll.read_own'), false);
  assert.equal(hasPermission(invoiceManager, 'payroll.read_all'), false);
});

test('initial system roles receive the appropriate payroll scope', () => {
  const permissionKeys = PERMISSIONS.map(([key]) => key);
  const worker = ROLE_DEFINITIONS.find((role) => role.slug === 'worker');
  const productionManager = ROLE_DEFINITIONS.find((role) => role.slug === 'production-manager');
  const invoiceManager = ROLE_DEFINITIONS.find((role) => role.slug === 'invoice-manager');

  assert.equal(permissionKeys.includes('payroll.read_own'), true);
  assert.equal(permissionKeys.includes('payroll.read_all'), true);
  assert.equal(worker.permissions.includes('payroll.read_own'), true);
  assert.equal(productionManager.permissions.includes('payroll.read_all'), true);
  assert.equal(
    invoiceManager.permissions.some((permission) => permission.startsWith('payroll.')),
    false
  );
});
