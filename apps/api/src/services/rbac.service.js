const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
const User = require('../models/user.model');

const PERMISSIONS = [
  ['*', '*', '*', 'Full system access'],
  ['production_order.create', 'production_order', 'create', 'Create production orders'],
  ['production_order.read', 'production_order', 'read', 'View production orders'],
  ['production_order.update', 'production_order', 'update', 'Update production orders'],
  ['production_order.assign', 'production_order', 'assign', 'Assign workers to production orders'],
  ['production_order.delete', 'production_order', 'delete', 'Delete production orders'],
  ['production_entry.create', 'production_entry', 'create', 'Create production entries'],
  ['production_entry.read_own', 'production_entry', 'read_own', 'View own production entries'],
  ['production_entry.read_all', 'production_entry', 'read_all', 'View all production entries'],
  [
    'production_entry.update_own',
    'production_entry',
    'update_own',
    'Update own production entries',
  ],
  [
    'production_entry.update_all',
    'production_entry',
    'update_all',
    'Update all production entries',
  ],
  ['production_entry.approve', 'production_entry', 'approve', 'Approve production entries'],
  ['production_entry.reject', 'production_entry', 'reject', 'Reject production entries'],
  ['payroll.read_own', 'payroll', 'read_own', 'View own payroll earnings'],
  ['payroll.read_all', 'payroll', 'read_all', 'View all worker payroll reports'],
  ['payroll.export_pdf', 'payroll', 'export_pdf', 'Generate admin payroll PDF reports'],
  ['invoice.*', 'invoice', '*', 'Manage invoices and statements'],
  ['client.*', 'client', '*', 'Manage clients'],
  ['product.*', 'product', '*', 'Manage catalogue products'],
  ['business.*', 'business', '*', 'Manage the business profile'],
  ['bank_account.*', 'bank_account', '*', 'Manage bank accounts'],
  ['user.*', 'user', '*', 'Manage users and role assignments'],
  ['role.*', 'role', '*', 'Manage roles and permissions'],
];

const ROLE_DEFINITIONS = [
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Full access to all Sania Clothing functionality',
    permissions: ['*'],
  },
  {
    name: 'Production Manager',
    slug: 'production-manager',
    description: 'Manages production orders, entries, and approvals',
    permissions: [
      'production_order.create',
      'production_order.read',
      'production_order.update',
      'production_order.assign',
      'production_order.delete',
      'production_entry.create',
      'production_entry.read_all',
      'production_entry.update_all',
      'production_entry.approve',
      'production_entry.reject',
      'payroll.read_all',
      'client.*',
      'product.*',
    ],
  },
  {
    name: 'Worker',
    slug: 'worker',
    description: 'Views assigned work and records personal production',
    permissions: [
      'production_order.read',
      'production_entry.create',
      'production_entry.read_own',
      'production_entry.update_own',
      'payroll.read_own',
    ],
  },
  {
    name: 'Invoice Manager',
    slug: 'invoice-manager',
    description: 'Manages the complete invoice workflow and supporting client data',
    permissions: ['invoice.*', 'client.*'],
  },
];

async function upsertPermission([key, resource, action, description]) {
  return Permission.findOneAndUpdate(
    { key },
    { $set: { resource, action, description, isSystem: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function assignInitialAdminSafely(adminRole) {
  const rolelessFilter = { $or: [{ role: { $exists: false } }, { role: null }] };
  const activeAdminCount = await User.countDocuments({
    role: adminRole._id,
    isActive: { $ne: false },
  });
  if (activeAdminCount > 0) return null;

  const initialAdministrator = await User.findOne(rolelessFilter).sort({ _id: 1 });
  if (!initialAdministrator) return null;

  initialAdministrator.role = adminRole._id;
  await initialAdministrator.save({ validateBeforeSave: false });
  return initialAdministrator;
}

async function initializeRbac() {
  const additivePermissionKeys = [
    'payroll.read_own',
    'payroll.read_all',
    'production_order.assign',
  ];
  const existingAdditivePermissionKeys = new Set(
    await Permission.find({ key: { $in: additivePermissionKeys } }).distinct('key')
  );
  const permissions = await Promise.all(PERMISSIONS.map(upsertPermission));
  const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));

  const roles = {};
  for (const definition of ROLE_DEFINITIONS) {
    const permissionIds = definition.permissions.map((key) => permissionByKey.get(key)._id);
    roles[definition.slug] = await Role.findOneAndUpdate(
      { slug: definition.slug },
      {
        $setOnInsert: {
          name: definition.name,
          description: definition.description,
          permissions: permissionIds,
          isSystem: true,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const fullAccessPermission = permissionByKey.get('*');
  await Role.updateMany(
    { slug: { $in: ROLE_DEFINITIONS.map((definition) => definition.slug) } },
    { $set: { isSystem: true, isActive: true } }
  );
  roles.admin = await Role.findOneAndUpdate(
    { slug: 'admin' },
    { $set: { permissions: [fullAccessPermission._id], isSystem: true, isActive: true } },
    { new: true }
  );

  const initialAdditiveGrants = [
    ['production-manager', 'payroll.read_all'],
    ['worker', 'payroll.read_own'],
    ['production-manager', 'production_order.assign'],
  ];
  for (const [slug, permissionKey] of initialAdditiveGrants) {
    if (!existingAdditivePermissionKeys.has(permissionKey)) {
      roles[slug] = await Role.findOneAndUpdate(
        { slug },
        { $addToSet: { permissions: permissionByKey.get(permissionKey)._id } },
        { new: true }
      );
    }
  }

  const initialAdministrator = await assignInitialAdminSafely(roles.admin);
  if (initialAdministrator) {
    console.log(`RBAC migration assigned Admin to existing user ${initialAdministrator._id}`);
  }

  return roles;
}

module.exports = {
  PERMISSIONS,
  ROLE_DEFINITIONS,
  initializeRbac,
  assignInitialAdminSafely,
};
