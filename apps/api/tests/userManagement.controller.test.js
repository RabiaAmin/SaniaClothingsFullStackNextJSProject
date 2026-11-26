const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/user.model');
const Role = require('../src/models/role.model');
const controller = require('../src/controllers/userManagement.controller');
const { authorize } = require('../src/middleware/authorization.middleware');

const adminCaller = {
  _id: 'admin-1',
  mustChangePassword: false,
  role: { slug: 'admin', isActive: true, permissions: [{ key: '*' }] },
};

function invoke(handler, { body = {}, params = {}, user = adminCaller } = {}) {
  return new Promise((resolve, reject) => {
    const result = {};
    handler(
      { body, params, user },
      {
        status(status) {
          result.status = status;
          return this;
        },
        json(payload) {
          result.body = payload;
          resolve(result);
        },
      },
      reject
    );
  });
}

async function createUserWithRole(role, username) {
  const originals = {
    findById: Role.findById,
    save: User.prototype.save,
    populate: User.prototype.populate,
  };
  const saved = [];
  Role.findById = () => ({ populate: async () => role });
  User.prototype.save = async function save() {
    saved.push(this);
    return this;
  };
  User.prototype.populate = async function populate() {
    return this;
  };
  try {
    const response = await invoke(controller.createUser, {
      body: {
        username,
        email: `${role.slug}@example.com`,
        phone: '+27 82 555 0100',
        roleId: role._id,
      },
    });
    return { response, savedUser: saved[0] };
  } finally {
    Role.findById = originals.findById;
    User.prototype.save = originals.save;
    User.prototype.populate = originals.populate;
  }
}

const ROLES = {
  worker: {
    _id: '64b000000000000000000001',
    slug: 'worker',
    isActive: true,
    permissions: [{ key: 'production_order.read' }, { key: 'production_entry.create' }],
  },
  productionManager: {
    _id: '64b000000000000000000002',
    slug: 'production-manager',
    isActive: true,
    permissions: [{ key: 'production_order.create' }, { key: 'production_entry.approve' }],
  },
  invoiceManager: {
    _id: '64b000000000000000000003',
    slug: 'invoice-manager',
    isActive: true,
    permissions: [{ key: 'invoice.*' }, { key: 'client.*' }],
  },
  admin: {
    _id: '64b000000000000000000004',
    slug: 'admin',
    isActive: true,
    permissions: [{ key: '*' }],
  },
  custom: {
    _id: '64b000000000000000000005',
    slug: 'auditor',
    isActive: true,
    permissions: [{ key: 'invoice.read' }],
  },
};

const SAME_FORMAT_CASES = [
  { label: 'Worker', role: ROLES.worker, username: 'shahzad ali', password: 'shahzadali123#' },
  {
    label: 'Production Manager',
    role: ROLES.productionManager,
    username: 'pm one',
    password: 'pmone123#',
  },
  {
    label: 'Invoice Manager',
    role: ROLES.invoiceManager,
    username: 'billing',
    password: 'billing123#',
  },
  { label: 'Admin', role: ROLES.admin, username: 'second admin', password: 'secondadmin123#' },
  { label: 'custom role', role: ROLES.custom, username: 'audit user', password: 'audituser123#' },
];

for (const { label, role, username, password } of SAME_FORMAT_CASES) {
  test(`Admin-created ${label} receives <username>123# and no forced password change`, async () => {
    const { response, savedUser } = await createUserWithRole(role, username);
    assert.equal(response.status, 201);
    assert.equal(response.body.temporaryPassword, password);
    assert.equal(response.body.user.mustChangePassword, false);
    assert.equal(savedUser.mustChangePassword, false);
    // The stored username is preserved; only the generated password drops whitespace.
    assert.equal(savedUser.username, username);
  });
}

test('Admin-created users can call permission-protected APIs immediately', async () => {
  const { savedUser } = await createUserWithRole(ROLES.productionManager, 'pm two');
  let nextCalled = false;
  let blockedStatus = null;
  authorize('production_order.create')(
    { user: { ...savedUser.toObject(), role: ROLES.productionManager } },
    {
      status(status) {
        blockedStatus = status;
        return this;
      },
      json() {},
    },
    () => {
      nextCalled = true;
    }
  );
  assert.equal(blockedStatus, null);
  assert.equal(nextCalled, true);
});

test('the creation response never exposes the stored password hash', async () => {
  const { response, savedUser } = await createUserWithRole(ROLES.productionManager, 'pm three');
  assert.equal('password' in response.body.user, false);
  // The plaintext is assigned only to the document; the existing pre-save hook hashes it.
  assert.equal(typeof savedUser.password, 'string');
});

test('the generated password is stored as a bcrypt hash by the existing pre-save hook', async () => {
  const bcrypt = require('bcryptjs');
  const user = new User({
    username: 'pm four',
    email: 'pm4@example.com',
    phone: '+27 82 555 0100',
    aboutMe: 'Internal user account',
    password: 'pmfour123#',
  });
  // Run only the pre-save middleware (no database write).
  await new Promise((resolve, reject) =>
    User.schema.s.hooks.execPre('save', user, [], (error) => (error ? reject(error) : resolve()))
  );
  assert.notEqual(user.password, 'pmfour123#');
  assert.equal(await bcrypt.compare('pmfour123#', user.password), true);
});
