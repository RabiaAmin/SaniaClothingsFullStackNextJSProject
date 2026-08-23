const business = {
  _id: 'business-1',
  id: 'business-1',
  name: 'Sania Clothing',
  email: 'hello@sania.test',
  phone: '+27 82 555 0100',
  telPhone: '+27 21 555 0101',
  address: 'Cape Town, South Africa',
  vatNumber: 'VAT-123',
  ckNumber: 'CK-456',
  fax: '+27 21 555 0102',
  currency: 'ZAR',
};

const clients = [
  {
    _id: 'client-1',
    name: 'Acme Retail',
    email: 'buyer@acme.test',
    phone: '+27 82 555 0111',
    vatNumber: 'VAT-555',
    vatApplicable: true,
    vatRate: 15,
  },
  {
    _id: 'client-2',
    name: 'Boutique House',
    email: 'orders@boutique.test',
    phone: '+27 82 555 0222',
    vatApplicable: false,
  },
];

const products = [
  {
    _id: 'prod-1',
    name: 'Denim Work Jacket',
    description: 'Structured jacket with reinforced seams for daily production wear.',
    category: 'Jackets',
    stock: 12,
    isActive: true,
    images: [],
  },
  {
    _id: 'prod-2',
    name: 'Cotton Utility Shirt',
    description: 'Breathable shirt suitable for custom branding and bulk production.',
    category: 'Shirts',
    stock: 30,
    isActive: true,
    images: [],
  },
];

const bankAccounts = [
  {
    _id: 'bank-1',
    accountType: 'VAT',
    bankName: 'FNB',
    accountHolderName: 'Sania Clothing',
    accountNumber: '1234567890',
    branchCode: '250655',
  },
  {
    _id: 'bank-2',
    accountType: 'NON_VAT',
    bankName: 'Standard Bank',
    accountHolderName: 'Sania Clothing',
    accountNumber: '9876543210',
    branchCode: '051001',
  },
];

const invoices = [
  {
    _id: 'invoice-1',
    invoiceNumber: '1001',
    poNumber: 'PO-001',
    date: '2026-06-01T10:00:00.000Z',
    createdAt: '2026-06-01T10:00:00.000Z',
    toClient: 'client-1',
    fromBusiness: 'business-1',
    category: 'Finished Garments',
    items: [{ quantity: 2, description: 'Denim jackets', unitPrice: 500, amount: 1000 }],
    subTotal: 1000,
    tax: 150,
    totalAmount: 1150,
    status: 'Sent',
  },
  {
    _id: 'invoice-2',
    invoiceNumber: '1002',
    poNumber: 'PO-002',
    date: '2026-06-02T10:00:00.000Z',
    createdAt: '2026-06-02T10:00:00.000Z',
    toClient: 'client-2',
    fromBusiness: 'business-1',
    category: 'CMT Services',
    items: [{ quantity: 1, description: 'Cut and trim service', unitPrice: 800, amount: 800 }],
    subTotal: 800,
    tax: 0,
    totalAmount: 800,
    status: 'Paid',
  },
];

const user = {
  _id: 'user-1',
  username: 'admin',
  email: 'admin@sania.test',
  phone: '+27 82 555 0999',
  aboutMe: 'Admin user',
  avatar: { public_id: 'avatar-1', url: '' },
  isActive: true,
  mustChangePassword: false,
  role: { _id: 'role-admin', name: 'Admin', slug: 'admin' },
  permissions: ['*'],
};

const permissions = [
  { _id: 'permission-all', key: '*', resource: '*', action: '*', description: 'Full access' },
  {
    _id: 'permission-invoice',
    key: 'invoice.*',
    resource: 'invoice',
    action: '*',
    description: 'Manage invoices',
  },
  {
    _id: 'permission-client',
    key: 'client.*',
    resource: 'client',
    action: '*',
    description: 'Manage clients',
  },
  {
    _id: 'permission-entry-own',
    key: 'production_entry.read_own',
    resource: 'production_entry',
    action: 'read_own',
    description: 'View own entries',
  },
];

const roles = [
  {
    _id: 'role-admin',
    name: 'Admin',
    slug: 'admin',
    description: 'Full access',
    isSystem: true,
    isActive: true,
    assignedUserCount: 1,
    permissions: [permissions[0]],
  },
  {
    _id: 'role-worker',
    name: 'Worker',
    slug: 'worker',
    description: 'Production worker',
    isSystem: true,
    isActive: true,
    assignedUserCount: 0,
    permissions: [permissions[3]],
  },
  {
    _id: 'role-invoice',
    name: 'Invoice Manager',
    slug: 'invoice-manager',
    description: 'Invoice access',
    isSystem: true,
    isActive: true,
    assignedUserCount: 0,
    permissions: [permissions[1], permissions[2]],
  },
  {
    _id: 'role-auditor',
    name: 'Custom Auditor',
    slug: 'custom-auditor',
    description: 'Read-only custom access',
    isSystem: false,
    isActive: false,
    assignedUserCount: 0,
    permissions: [],
  },
];

function response(route, body, status = 200, headers = {}) {
  return route.fulfill({
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function readPayload(route) {
  const request = route.request();
  const contentType = request.headers()['content-type'] ?? '';
  if (contentType.includes('application/json')) {
    return request.postDataJSON();
  }
  return request.postData();
}

async function mockApi(page, options = {}) {
  const calls = [];
  const currentUser = options.user ?? user;
  let sessionUser = currentUser;
  let createdUser = null;
  let createdUserPassword = null;
  const managedUsers = [currentUser];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204 });
    }

    calls.push({ method, path, payload: method === 'GET' ? null : await readPayload(route) });

    if (method === 'GET' && path === '/user/getUser') {
      return response(route, { success: true, user: sessionUser });
    }
    if (method === 'POST' && path === '/user/login') {
      const credentials = await readPayload(route);
      if (createdUser && credentials.email === createdUser.email) {
        if (credentials.password !== createdUserPassword) {
          return response(route, { success: false, message: 'Invalid Email Or Password!' }, 401);
        }
        sessionUser = createdUser;
      }
      const pageOrigin = new URL(page.url()).origin;
      await page.context().addCookies([
        {
          name: 'token',
          value: 'test-token',
          url: pageOrigin,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
      return response(route, { success: true, token: 'test-token', user: sessionUser }, 200, {
        'set-cookie': 'token=test-token; Path=/; SameSite=Lax; HttpOnly',
      });
    }
    if (method === 'GET' && path === '/user/logout') {
      return response(route, { success: true });
    }
    if (method === 'PUT' && path === '/user/update/password') {
      if (createdUser && sessionUser._id === createdUser._id) {
        const payload = await readPayload(route);
        if (payload.currentPassword !== createdUserPassword) {
          return response(route, { success: false, message: 'Incorrect Current Password' }, 400);
        }
        createdUserPassword = payload.newPassword;
        createdUser = { ...createdUser, mustChangePassword: false };
        sessionUser = createdUser;
      }
      return response(route, { success: true, message: 'Password Updated!' });
    }
    if (method === 'POST' && path === '/user/password/forgot') {
      return response(route, { success: true, message: 'Email sent' });
    }
    if (method === 'PUT' && path.startsWith('/user/password/reset/')) {
      return response(route, { success: true, token: 'reset-token' });
    }

    if (method === 'GET' && path === '/roles') {
      return response(route, { success: true, roles });
    }
    if (method === 'GET' && path === '/roles/permissions') {
      return response(route, { success: true, permissions });
    }
    if (method === 'GET' && path.startsWith('/roles/') && path.endsWith('/users')) {
      const roleId = path.split('/')[2];
      const role = roles.find((item) => item._id === roleId);
      const users = currentUser.role?._id === roleId ? [currentUser] : [];
      return response(route, { success: true, role, users });
    }
    if (method === 'POST' && path === '/roles') {
      return response(route, { success: true, role: roles[1] }, 201);
    }
    if (method === 'PUT' && path.startsWith('/roles/')) {
      return response(route, { success: true, role: roles[1] });
    }
    if (method === 'DELETE' && path.startsWith('/roles/')) {
      return response(route, { success: true });
    }
    if (method === 'GET' && path === '/users') {
      return response(route, { success: true, users: managedUsers });
    }
    if (method === 'POST' && path === '/users') {
      const payload = await readPayload(route);
      const role = roles.find((item) => item._id === payload.roleId);
      createdUserPassword = 'TempWorkerA1!secure';
      createdUser = {
        _id: 'user-created-worker',
        username: payload.username,
        email: payload.email,
        phone: payload.phone,
        aboutMe: payload.aboutMe || 'Internal user account',
        isActive: true,
        mustChangePassword: true,
        role: { _id: role._id, name: role.name, slug: role.slug },
        permissions: ['production_order.read', 'production_entry.read_own'],
      };
      managedUsers.push(createdUser);
      return response(
        route,
        { success: true, user: createdUser, temporaryPassword: createdUserPassword },
        201
      );
    }
    if (method === 'PUT' && path.startsWith('/users/')) {
      return response(route, { success: true, user: currentUser });
    }

    if (method === 'GET' && path === '/business/get') {
      return response(route, { success: true, business });
    }
    if (
      (method === 'POST' && path === '/business/create') ||
      (method === 'PUT' && path === '/business/update')
    ) {
      return response(route, { success: true, business });
    }

    if (method === 'GET' && path === '/client/getAll') {
      return response(route, { success: true, clients });
    }
    if (method === 'GET' && path.startsWith('/client/get/')) {
      return response(route, { success: true, client: clients[0] });
    }
    if (method === 'POST' && path === '/client/add') {
      return response(route, { success: true, client: { _id: 'client-new' } }, 201);
    }
    if (method === 'PUT' && path.startsWith('/client/update/')) {
      return response(route, { success: true, client: clients[0] });
    }
    if (method === 'DELETE' && path.startsWith('/client/delete/')) {
      return response(route, { success: true });
    }

    if (method === 'GET' && path === '/bankAccount/getAll') {
      return response(route, { success: true, bankAccounts });
    }
    if (method === 'GET' && path.startsWith('/bankAccount/get/')) {
      return response(route, { success: true, bankAccount: bankAccounts[0] });
    }
    if (method === 'POST' && path === '/bankAccount/create') {
      return response(route, { success: true, bankAccount: bankAccounts[0] }, 201);
    }
    if (method === 'PUT' && path.startsWith('/bankAccount/update/')) {
      return response(route, { success: true, bankAccount: bankAccounts[0] });
    }
    if (method === 'DELETE' && path.startsWith('/bankAccount/delete/')) {
      return response(route, { success: true });
    }

    if (method === 'GET' && path === '/product/getAll') {
      return response(route, { success: true, products });
    }
    if (method === 'GET' && path.startsWith('/product/get/')) {
      const id = path.split('/').pop();
      return response(route, {
        success: true,
        product: products.find((p) => p._id === id) ?? products[0],
      });
    }
    if (method === 'POST' && path === '/product/create') {
      return response(route, { success: true, product: products[0] }, 201);
    }
    if (method === 'PUT' && path.startsWith('/product/update/')) {
      return response(route, { success: true, product: products[0] });
    }
    if (method === 'DELETE' && path.startsWith('/product/delete/')) {
      return response(route, { success: true });
    }

    if (method === 'GET' && path === '/business/invoice/getAllOfThisMonth') {
      return response(route, {
        success: true,
        invoices,
        page: 1,
        totalPages: 1,
        totalRecords: invoices.length,
        stats: {
          totalInvoices: invoices.length,
          totalPaid: 1,
          totalPending: 0,
          totalSent: 1,
          totalRevenue: 1950,
        },
      });
    }
    if (method === 'GET' && path.startsWith('/business/invoice/get/')) {
      return response(route, {
        success: true,
        invoice: { ...invoices[0], fromBusiness: business, toClient: clients[0] },
        bankAccount: bankAccounts[0],
      });
    }
    if (method === 'GET' && path === '/business/invoice/weekly-statements') {
      return response(route, {
        success: true,
        statements: [
          {
            _id: 'Acme Retail',
            totalInvoices: 1,
            totalAmount: 1150,
            invoices: [invoices[0]],
          },
        ],
      });
    }
    if (method === 'POST' && path === '/business/invoice/create') {
      return response(route, { success: true, invoice: invoices[0] }, 201);
    }
    if (method === 'PUT' && path.startsWith('/business/invoice/update/')) {
      return response(route, { success: true, invoice: invoices[0] });
    }
    if (method === 'DELETE' && path.startsWith('/business/invoice/delete/')) {
      return response(route, { success: true });
    }
    if (method === 'PUT' && path === '/business/invoice/mark-as-paid') {
      return response(route, { success: true });
    }

    return response(
      route,
      { success: false, message: `Unhandled mock route: ${method} ${path}` },
      500
    );
  });

  return calls;
}

async function signInAsAdmin(page) {
  await page.context().addCookies([
    {
      name: 'token',
      value: 'test-token',
      url: 'http://127.0.0.1:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

module.exports = {
  mockApi,
  signInAsAdmin,
};
