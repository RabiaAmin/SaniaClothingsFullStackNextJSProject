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
  {
    _id: 'permission-payroll-own',
    key: 'payroll.read_own',
    resource: 'payroll',
    action: 'read_own',
    description: 'View own monthly earnings',
  },
  {
    _id: 'permission-payroll-all',
    key: 'payroll.read_all',
    resource: 'payroll',
    action: 'read_all',
    description: 'View all monthly payroll',
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
    permissions: [permissions[3], permissions[4]],
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

const productionOrder = {
  _id: 'production-order-1',
  poNumber: 'PO-2026-001',
  itemCode: 'JK001',
  client: { _id: 'client-1', name: 'Acme Retail', email: 'buyer@acme.test' },
  product: { _id: 'prod-1', name: 'Denim Work Jacket', category: 'Jackets' },
  productionDescription: 'Navy work jackets for winter delivery',
  orderedQuantity: 120,
  approvedQuantity: 80,
  producedQuantity: 80,
  remainingQuantity: 40,
  progressPercentage: 67,
  workerRate: 12.5,
  startDate: '2026-08-01T00:00:00.000Z',
  dueDate: '2026-08-31T00:00:00.000Z',
  status: 'IN_PROGRESS',
  notes: 'Use reinforced navy stitching.',
  createdBy: { _id: 'user-1', username: 'admin', email: 'admin@sania.test' },
  updatedBy: { _id: 'user-1', username: 'admin', email: 'admin@sania.test' },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

const worker = {
  _id: 'user-worker',
  username: 'worker',
  email: 'worker@sania.test',
};

const secondWorker = {
  _id: 'user-worker-2',
  username: 'worker-two',
  email: 'worker2@sania.test',
};

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
  let currentApprovedQuantity = productionOrder.approvedQuantity;
  const productionEntries = [
    {
      _id: 'production-entry-pending',
      productionOrder: { ...productionOrder },
      worker,
      date: '2026-08-20T00:00:00.000Z',
      quantity: options.productionEntryQuantity ?? 30,
      unitRate: 12.5,
      totalAmount: (options.productionEntryQuantity ?? 30) * 12.5,
      notes: 'Morning production run',
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: '',
    },
    {
      _id: 'production-entry-approved',
      productionOrder: { ...productionOrder },
      worker: secondWorker,
      date: '2026-08-19T00:00:00.000Z',
      quantity: 80,
      unitRate: 12.5,
      totalAmount: 1000,
      notes: '',
      status: 'APPROVED',
      reviewedBy: user,
      reviewedAt: '2026-08-20T00:00:00.000Z',
      reviewNotes: 'Count verified',
    },
  ];
  const notifications = [
    {
      _id: 'notification-submitted',
      recipient: currentUser._id,
      actor: worker,
      type: 'PRODUCTION_ENTRY_SUBMITTED',
      message: 'worker submitted 40 pieces for PO-2026-001.',
      productionEntry: productionEntries[0],
      productionOrder,
      metadata: { quantity: 40, poNumber: productionOrder.poNumber },
      isRead: false,
      readAt: null,
      createdAt: '2026-08-24T08:00:00.000Z',
    },
    {
      _id: 'notification-approved',
      recipient: currentUser._id,
      actor: user,
      type: 'PRODUCTION_ENTRY_APPROVED',
      message: 'Your production entry of 80 pieces for PO-2026-001 was approved.',
      productionEntry: productionEntries[1],
      productionOrder,
      metadata: { quantity: 80, poNumber: productionOrder.poNumber },
      isRead: true,
      readAt: '2026-08-23T09:00:00.000Z',
      createdAt: '2026-08-23T09:00:00.000Z',
    },
  ];
  const relatedInvoices = options.noInvoiceMatch
    ? []
    : [
        {
          ...invoices[0],
          poNumber: productionOrder.poNumber,
        },
        ...(options.multipleInvoiceMatches
          ? [{ ...invoices[1], poNumber: productionOrder.poNumber }]
          : []),
      ];
  const invoiceRelationship = {
    state:
      relatedInvoices.length === 0 ? 'NONE' : relatedInvoices.length === 1 ? 'SINGLE' : 'MULTIPLE',
    matchCount: relatedInvoices.length,
    statuses: [...new Set(relatedInvoices.map((invoice) => invoice.status))],
    latestInvoice: relatedInvoices[0] ?? null,
    invoices: relatedInvoices,
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204 });
    }

    calls.push({
      method,
      path,
      query: Object.fromEntries(url.searchParams.entries()),
      payload: method === 'GET' ? null : await readPayload(route),
    });

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
        permissions: ['production_order.read', 'production_entry.read_own', 'payroll.read_own'],
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

    if (method === 'GET' && path === '/notifications/unread-count') {
      return response(route, {
        success: true,
        unreadCount: notifications.filter((notification) => !notification.isRead).length,
      });
    }
    if (method === 'GET' && path === '/notifications') {
      if (options.notificationError) {
        return response(route, { success: false, message: 'Could not load notifications' }, 500);
      }
      const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
      const visibleNotifications = options.notificationEmpty
        ? []
        : notifications.filter((notification) => !unreadOnly || !notification.isRead);
      return response(route, {
        success: true,
        notifications: visibleNotifications,
        page: 1,
        totalPages: 1,
        totalRecords: visibleNotifications.length,
      });
    }
    if (method === 'PATCH' && path === '/notifications/read-all') {
      notifications.forEach((notification) => {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
      });
      return response(route, {
        success: true,
        message: 'All notifications marked as read',
        modifiedCount: notifications.length,
      });
    }
    if (method === 'PATCH' && path.startsWith('/notifications/') && path.endsWith('/read')) {
      const notificationId = path.split('/')[2];
      const notification = notifications.find((item) => item._id === notificationId);
      if (!notification) {
        return response(route, { success: false, message: 'Notification not found' }, 404);
      }
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
      return response(route, { success: true, notification });
    }

    if (method === 'GET' && path === '/production-orders') {
      const productionOrders = [
        {
          ...productionOrder,
          approvedQuantity: currentApprovedQuantity,
          invoiceRelationship,
        },
        ...(options.includeLegacyProductionOrder
          ? [
              {
                ...productionOrder,
                _id: 'production-order-legacy',
                poNumber: 'PO-LEGACY-001',
                itemCode: undefined,
              },
            ]
          : []),
      ];
      return response(route, {
        success: true,
        productionOrders,
        page: 1,
        totalPages: 1,
        totalRecords: productionOrders.length,
      });
    }
    if (method === 'POST' && path === '/production-orders') {
      const payload = await readPayload(route);
      return response(
        route,
        {
          success: true,
          productionOrder: { ...productionOrder, ...payload, _id: 'production-order-created' },
        },
        201
      );
    }
    if (method === 'GET' && path.startsWith('/production-orders/')) {
      return response(route, {
        success: true,
        productionOrder,
        invoiceRelationship,
        matchingInvoices: relatedInvoices,
      });
    }
    if (method === 'PUT' && path.startsWith('/production-orders/')) {
      const payload = await readPayload(route);
      return response(route, {
        success: true,
        productionOrder: { ...productionOrder, ...payload },
      });
    }
    if (method === 'PATCH' && path.endsWith('/status')) {
      const payload = await readPayload(route);
      return response(route, {
        success: true,
        productionOrder: { ...productionOrder, status: payload.status },
      });
    }
    if (method === 'DELETE' && path.startsWith('/production-orders/')) {
      return response(route, { success: true });
    }

    if (method === 'GET' && path === '/production-entries') {
      const canReadAll =
        sessionUser.permissions?.includes('*') ||
        sessionUser.permissions?.includes('production_entry.read_all');
      let visibleEntries = canReadAll
        ? productionEntries
        : productionEntries.filter((entry) => entry.worker._id === sessionUser._id);
      const requestedStatus = url.searchParams.get('status');
      if (requestedStatus) {
        visibleEntries = visibleEntries.filter((entry) => entry.status === requestedStatus);
      }
      return response(route, {
        success: true,
        productionEntries: visibleEntries,
        stats: {
          pendingEntries: visibleEntries.filter((entry) => entry.status === 'PENDING').length,
          approvedEntries: visibleEntries.filter((entry) => entry.status === 'APPROVED').length,
          rejectedEntries: visibleEntries.filter((entry) => entry.status === 'REJECTED').length,
          submittedQuantity: visibleEntries.reduce((total, entry) => total + entry.quantity, 0),
          approvedQuantity: visibleEntries
            .filter((entry) => entry.status === 'APPROVED')
            .reduce((total, entry) => total + entry.quantity, 0),
          approvedAmount: visibleEntries
            .filter((entry) => entry.status === 'APPROVED')
            .reduce((total, entry) => total + entry.totalAmount, 0),
        },
        page: 1,
        totalPages: 1,
        totalRecords: visibleEntries.length,
      });
    }
    if (method === 'POST' && path === '/production-entries') {
      const payload = await readPayload(route);
      const entry = {
        _id: 'production-entry-created',
        productionOrder: { ...productionOrder },
        worker: {
          _id: sessionUser._id,
          username: sessionUser.username,
          email: sessionUser.email,
        },
        date: payload.date,
        quantity: payload.quantity,
        unitRate: productionOrder.workerRate,
        totalAmount: payload.quantity * productionOrder.workerRate,
        notes: payload.notes ?? '',
        status: 'PENDING',
      };
      productionEntries.unshift(entry);
      return response(route, { success: true, productionEntry: entry }, 201);
    }
    if (method === 'PUT' && path.startsWith('/production-entries/')) {
      const entry = productionEntries.find((item) => path.endsWith(item._id));
      const payload = await readPayload(route);
      Object.assign(entry, payload, {
        totalAmount: (payload.quantity ?? entry.quantity) * entry.unitRate,
      });
      return response(route, { success: true, productionEntry: entry });
    }
    if (
      method === 'PATCH' &&
      (path.endsWith('/approve') || path.endsWith('/reject')) &&
      path.startsWith('/production-entries/')
    ) {
      const entryId = path.split('/')[2];
      const entry = productionEntries.find((item) => item._id === entryId);
      const approving = path.endsWith('/approve');
      if (approving && currentApprovedQuantity + entry.quantity > productionOrder.orderedQuantity) {
        return response(
          route,
          {
            success: false,
            message: 'This entry exceeds the remaining quantity or the production order is closed',
          },
          409
        );
      }
      if (approving) currentApprovedQuantity += entry.quantity;
      entry.status = approving ? 'APPROVED' : 'REJECTED';
      entry.reviewedBy = user;
      entry.reviewedAt = new Date().toISOString();
      return response(route, { success: true, productionEntry: entry });
    }

    if (method === 'GET' && path === '/payroll/monthly') {
      const payrollWorkers = [
        {
          worker,
          totalApprovedPieces: 40,
          totalEarnings: 600,
          entryCount: 1,
          entries: [
            {
              productionEntryId: 'payroll-entry-1',
              date: '2026-08-10T00:00:00.000Z',
              productionOrderId: 'production-order-1',
              poNumber: 'PO-1001',
              product: { _id: 'prod-1', name: 'Denim Work Jacket' },
              productionDescription: 'Navy work jackets',
              quantity: 40,
              unitRate: 15,
              amount: 600,
            },
          ],
        },
        {
          worker: secondWorker,
          totalApprovedPieces: 100,
          totalEarnings: 1200,
          entryCount: 1,
          entries: [
            {
              productionEntryId: 'payroll-entry-2',
              date: '2026-08-11T00:00:00.000Z',
              productionOrderId: 'production-order-2',
              poNumber: 'PO-1002',
              product: null,
              productionDescription: 'Cotton utility shirts',
              quantity: 100,
              unitRate: 12,
              amount: 1200,
            },
          ],
        },
      ];
      const canReadAll =
        sessionUser.permissions?.includes('*') ||
        sessionUser.permissions?.includes('payroll.read_all');
      const requestedWorker = canReadAll ? url.searchParams.get('workerId') : sessionUser._id;
      const visibleWorkers = requestedWorker
        ? payrollWorkers.filter((item) => item.worker._id === requestedWorker)
        : payrollWorkers;
      return response(route, {
        success: true,
        scope: canReadAll ? (requestedWorker ? 'worker' : 'all') : 'own',
        report: {
          period: {
            year: Number(url.searchParams.get('year')),
            month: Number(url.searchParams.get('month')),
            start: '2026-08-01T00:00:00.000Z',
            end: '2026-09-01T00:00:00.000Z',
          },
          summary: {
            workerCount: visibleWorkers.length,
            entryCount: visibleWorkers.reduce((total, item) => total + item.entryCount, 0),
            totalApprovedPieces: visibleWorkers.reduce(
              (total, item) => total + item.totalApprovedPieces,
              0
            ),
            totalEarnings: visibleWorkers.reduce((total, item) => total + item.totalEarnings, 0),
          },
          workers: visibleWorkers,
        },
      });
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
  const testPort = process.env.PLAYWRIGHT_PORT ?? '3000';
  await page.context().addCookies([
    {
      name: 'token',
      value: 'test-token',
      url: `http://127.0.0.1:${testPort}`,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

module.exports = {
  mockApi,
  signInAsAdmin,
};
