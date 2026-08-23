const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test('production order list supports progress, status, and PO search', async ({ page }) => {
  await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/production-orders');

  await expect(page.getByRole('heading', { name: 'Production Orders' })).toBeVisible();
  await expect(page.getByText('PO-2026-001', { exact: true })).toBeVisible();
  await expect(page.getByText('Ordered: 120')).toBeVisible();
  await expect(page.getByText('Produced: 80')).toBeVisible();
  await expect(page.getByText('Remaining: 40')).toBeVisible();
  await page.getByPlaceholder('Search PO number or description').fill('PO-2026-001');
  await expect(page.getByText('PO-2026-001', { exact: true })).toBeVisible();
});

test('admin can create a production order independently from invoices', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/production-orders/create');

  await page.getByLabel('PO Number *').fill('po-2026-002');
  const selects = page.getByRole('combobox');
  await selects.nth(0).click();
  await page.getByRole('option', { name: 'Acme Retail' }).click();
  await selects.nth(1).click();
  await page.getByRole('option', { name: 'Denim Work Jacket' }).click();
  await page.getByLabel('Production description *').fill('Blue denim jackets');
  await page.getByLabel('Ordered quantity *').fill('120');
  await page.getByLabel('Worker rate per approved unit *').fill('15.50');
  await page.getByLabel('Start date *').fill('2026-09-01');
  await page.getByLabel('Due date *').fill('2026-09-30');
  await page.getByLabel('Notes').fill('Production-only instructions');
  await page.getByRole('button', { name: 'Create Production Order' }).click();

  await expect(page).toHaveURL(/\/production-orders\/production-order-created$/);
  await expect
    .poll(() => calls.find((call) => call.method === 'POST' && call.path === '/production-orders'))
    .toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          poNumber: 'po-2026-002',
          clientId: 'client-1',
          productId: 'prod-1',
          orderedQuantity: 120,
          workerRate: 15.5,
        }),
      })
    );
  expect(calls.some((call) => call.method !== 'GET' && call.path.includes('invoice'))).toBe(false);
});

test('detail view shows progress, invoice matches, and status management', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/production-orders/production-order-1');

  await expect(page.getByRole('heading', { name: 'PO-2026-001' })).toBeVisible();
  await expect(page.getByText('Ordered').locator('..').getByText('120')).toBeVisible();
  await expect(page.getByText('Produced').locator('..').getByText('80')).toBeVisible();
  await expect(page.getByText('Remaining').locator('..').getByText('40')).toBeVisible();
  await expect(page.getByRole('link', { name: /Invoice 1001/ })).toBeVisible();

  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Pending' }).click();
  await expect
    .poll(() =>
      calls.find(
        (call) =>
          call.method === 'PATCH' && call.path === '/production-orders/production-order-1/status'
      )
    )
    .toEqual(expect.objectContaining({ payload: { status: 'PENDING' } }));
});

test('worker can read orders but cannot create, edit, or query client administration', async ({
  page,
}) => {
  const calls = await mockApi(page, {
    user: {
      _id: 'user-worker',
      username: 'worker',
      email: 'worker@sania.test',
      isActive: true,
      mustChangePassword: false,
      role: { _id: 'role-worker', name: 'Worker', slug: 'worker' },
      permissions: ['production_order.read', 'production_entry.read_own'],
    },
  });
  await signInAsAdmin(page);
  await page.goto('/production-orders');

  await expect(page.getByText('PO-2026-001', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New Production Order' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit PO-2026-001' })).toHaveCount(0);
  expect(calls.some((call) => call.method === 'GET' && call.path === '/client/getAll')).toBe(false);

  await page.goto('/production-orders/create');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  expect(calls.some((call) => call.method === 'POST' && call.path === '/production-orders')).toBe(
    false
  );
});

test('invoice manager receives no production-order navigation or page access', async ({ page }) => {
  await mockApi(page, {
    user: {
      _id: 'user-invoice',
      username: 'invoice-manager',
      email: 'invoice@sania.test',
      isActive: true,
      mustChangePassword: false,
      role: { _id: 'role-invoice', name: 'Invoice Manager', slug: 'invoice-manager' },
      permissions: ['invoice.*', 'client.*'],
    },
  });
  await signInAsAdmin(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Production Orders' })).toHaveCount(0);

  await page.goto('/production-orders');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});
