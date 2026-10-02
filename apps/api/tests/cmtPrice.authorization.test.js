const test = require('node:test');
const assert = require('node:assert/strict');
const { authorize } = require('../src/middleware/authorization.middleware');
const { PERMISSIONS, ROLE_DEFINITIONS } = require('../src/services/rbac.service');

function invoke(middleware, user) {
  return new Promise((resolve) => {
    const result = {};
    middleware(
      { user },
      {
        status(status) {
          result.status = status;
          return this;
        },
        json(body) {
          result.body = body;
          resolve(result);
        },
      },
      () => resolve({ status: 200 })
    );
  });
}

test('CMT price management is registered in RBAC but not granted to workers', () => {
  assert.ok(PERMISSIONS.some(([key]) => key === 'cmt_price.*'));
  const worker = ROLE_DEFINITIONS.find((role) => role.slug === 'worker');
  const productionManager = ROLE_DEFINITIONS.find((role) => role.slug === 'production-manager');
  assert.equal(
    worker.permissions.some((key) => key.startsWith('cmt_price.')),
    false
  );
  assert.equal(
    productionManager.permissions.some((key) => key.startsWith('cmt_price.')),
    false
  );
});

test('unauthenticated and worker users cannot manage CMT prices', async () => {
  const middleware = authorize('cmt_price.read');
  assert.equal((await invoke(middleware, null)).status, 401);
  const response = await invoke(middleware, {
    role: { permissions: [{ key: 'production_order.read' }] },
  });
  assert.equal(response.status, 403);
});

test('Admin wildcard permission can manage CMT prices', async () => {
  const response = await invoke(authorize('cmt_price.create'), {
    role: { permissions: [{ key: '*' }] },
  });
  assert.equal(response.status, 200);
});
