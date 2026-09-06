const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

const productionManager = {
  _id: 'user-production-manager',
  username: 'production-manager',
  email: 'production@sania.test',
  isActive: true,
  role: { _id: 'role-production', name: 'Production Manager', slug: 'production-manager' },
  permissions: [
    'production_order.*',
    'production_entry.read_all',
    'production_entry.update_all',
    'production_entry.approve',
    'production_entry.reject',
    'payroll.read_all',
  ],
};

const worker = {
  _id: 'user-worker',
  username: 'worker',
  email: 'worker@sania.test',
  isActive: true,
  role: { _id: 'role-worker', name: 'Worker', slug: 'worker' },
  permissions: [
    'production_order.read',
    'production_entry.create',
    'production_entry.read_own',
    'production_entry.update_own',
    'payroll.read_own',
  ],
};

const invoiceManager = {
  _id: 'user-invoice',
  username: 'invoice-manager',
  email: 'invoice@sania.test',
  isActive: true,
  role: { _id: 'role-invoice', name: 'Invoice Manager', slug: 'invoice-manager' },
  permissions: ['invoice.*', 'client.*'],
};

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

test('Admin sees authorized invoice and production business overviews', async ({ page }) => {
  await mockApi(page);
  await page.goto('/dashboard');

  await expect(page.getByTestId('invoice-dashboard')).toBeVisible();
  await expect(page.getByTestId('production-dashboard')).toBeVisible();
  await expect(page.getByText('Admin', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'User Access' })).toBeVisible();
});

test('Production Manager sees production operations without invoice access', async ({ page }) => {
  const calls = await mockApi(page, { user: productionManager });
  await page.goto('/dashboard');

  await expect(page.getByTestId('production-dashboard')).toBeVisible();
  await expect(page.getByText('Pending production entries')).toBeVisible();
  await expect(page.getByTestId('invoice-dashboard')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Invoice Manager' })).toHaveCount(0);
  expect(calls.some((call) => call.path.startsWith('/business/invoice'))).toBe(false);

  await page.goto('/invoices');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});

test('Production Manager sees due-soon and overdue production alerts without notifications', async ({
  page,
}) => {
  const calls = await mockApi(page, { user: productionManager, includeDeadlineAlerts: true });
  await page.goto('/dashboard');

  const alerts = page.getByTestId('production-alerts');
  await expect(alerts.getByText('PO-DUE-SOON · DUE001')).toBeVisible();
  await expect(alerts.getByText('Due soon', { exact: true })).toBeVisible();
  await expect(alerts.getByText('PO-OVERDUE · LATE001')).toBeVisible();
  await expect(alerts.getByText('Overdue', { exact: true })).toBeVisible();
  expect(calls.some((call) => call.method === 'POST' && call.path === '/notifications')).toBe(
    false
  );
});

test('Worker sees only personal production, earnings, orders, and notifications', async ({
  page,
}) => {
  const calls = await mockApi(page, { user: worker });
  await page.goto('/dashboard');

  await expect(page.getByTestId('worker-dashboard')).toBeVisible();
  await expect(page.getByText('Monthly pieces')).toBeVisible();
  await expect(page.getByText('Estimated earnings')).toBeVisible();
  await expect(page.getByText('Approved earnings')).toBeVisible();
  await expect(page.getByText('Available production orders')).toBeVisible();
  await expect(page.getByText('My Assigned Orders')).toBeVisible();
  await expect(page.getByText('JK001', { exact: true })).toBeVisible();
  await expect(page.getByText(/40 remaining/)).toBeVisible();
  await expect(page.getByText(/Deadline Aug 30, 2026/)).toBeVisible();
  await expect(page.getByText('In Progress', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByTestId('invoice-dashboard')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'User Access' })).toHaveCount(0);
  expect(calls.some((call) => call.path.startsWith('/business/invoice'))).toBe(false);

  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});

test('Worker sees assigned work separately from open production orders', async ({ page }) => {
  await mockApi(page, { user: worker, assignedWorkerIds: ['user-worker'] });
  await page.goto('/dashboard');

  await expect(page.getByText('My Assigned Orders')).toBeVisible();
  await expect(page.getByText('PO-2026-001', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('No unassigned production orders are available.')).toBeVisible();
});

test('Invoice Manager retains the invoice workflow without production access', async ({ page }) => {
  const calls = await mockApi(page, { user: invoiceManager });
  await page.goto('/dashboard');

  await expect(page.getByTestId('invoice-dashboard')).toBeVisible();
  await expect(page.getByTestId('production-dashboard')).toHaveCount(0);
  await expect(page.getByTestId('worker-dashboard')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Invoice Manager' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Production Orders' })).toHaveCount(0);
  expect(calls.some((call) => call.path === '/production-orders')).toBe(false);

  await page.goto('/production-orders');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});
