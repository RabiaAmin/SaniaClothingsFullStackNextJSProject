const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

const productionManagerUser = {
  _id: 'user-pm',
  username: 'production-manager',
  email: 'pm@sania.test',
  isActive: true,
  mustChangePassword: false,
  role: { _id: 'role-pm', name: 'Production Manager', slug: 'production-manager' },
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
};

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The Production Manager PWA is exercised by the mobile project.');
  test.setTimeout(90_000);
  await signInAsAdmin(page);
});

test('production manager phone dashboard offers install help and production navigation', async ({
  page,
}) => {
  await mockApi(page, { user: productionManagerUser, assignedWorkerIds: ['user-worker'] });
  await page.goto('/dashboard');

  await expect(page.getByTestId('production-dashboard')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('worker-install-card')).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Production navigation' });
  await expect(navigation).toBeVisible();
  for (const label of ['Home', 'Orders', 'Record', 'Entries', 'Payroll']) {
    await expect(navigation.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('navigation', { name: 'Worker navigation' })).toHaveCount(0);

  // The bottom-navigation Record action opens the manager recording dialog.
  await navigation.getByRole('link', { name: 'Record', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Record production' })
  ).toBeVisible({
    timeout: 30_000,
  });
});

test('production manager manages orders from phone cards and records verified production', async ({
  page,
}) => {
  const calls = await mockApi(page, {
    user: productionManagerUser,
    assignedWorkerIds: ['user-worker'],
  });
  await page.goto('/production-orders');

  const card = page.getByTestId('worker-order-card-production-order-1');
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('table:visible')).toHaveCount(0);
  await expect(card.getByText('Assigned workers')).toBeVisible();
  await expect(card.getByText('worker', { exact: true })).toBeVisible();
  await expect(card.getByText('40 remaining')).toBeVisible();
  await expect(page.getByRole('link', { name: 'New Production Order' })).toBeVisible();

  await card.getByRole('button', { name: 'Record production for PO-2026-001' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Production order *')).toContainText('PO-2026-001');
  await expect(dialog.getByLabel('Worker *')).toContainText('worker');
  await dialog.getByLabel('Production date *').fill('2026-08-23');
  await dialog.getByLabel('Verified quantity *').fill('12');
  await dialog.getByRole('button', { name: 'Record and approve' }).click();

  await expect
    .poll(() => calls.find((call) => call.method === 'POST' && call.path === '/production-entries'))
    .toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          productionOrderId: 'production-order-1',
          workerId: 'user-worker',
          quantity: 12,
        }),
      })
    );
});

test('production manager can open order creation with worker assignment on a phone', async ({
  page,
}) => {
  await mockApi(page, { user: productionManagerUser });
  await page.goto('/production-orders/create');

  await expect(page.getByRole('heading', { name: /production order/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Assigned Workers (optional)')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});

test('production manager reviews and reverses entries from phone cards', async ({ page }) => {
  const calls = await mockApi(page, {
    user: productionManagerUser,
    assignedWorkerIds: ['user-worker', 'user-worker-2'],
  });
  await page.goto('/production-entries');

  await expect(page.getByTestId('manager-entry-cards')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('table:visible')).toHaveCount(0);
  const pendingCard = page.getByTestId('worker-entry-card-production-entry-pending');
  await expect(
    pendingCard.getByRole('button', { name: 'Approve entry for PO-2026-001' })
  ).toBeVisible();
  await expect(
    pendingCard.getByRole('button', { name: 'Reject entry for PO-2026-001' })
  ).toBeVisible();

  const approvedCard = page.getByTestId('worker-entry-card-production-entry-approved');
  await approvedCard.getByRole('button', { name: 'Reverse entry for PO-2026-001' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason for reversal *').fill('Duplicate count');
  await dialog.getByRole('button', { name: 'Reverse entry' }).click();
  await expect
    .poll(() => calls.find((call) => call.method === 'PATCH' && call.path.endsWith('/reverse')))
    .toEqual(expect.objectContaining({ payload: { reason: 'Duplicate count' } }));
});

test('Admin keeps the existing phone layout without the manager PWA additions', async ({
  page,
}) => {
  await mockApi(page, { assignedWorkerIds: ['user-worker'] });
  await page.goto('/production-orders');

  await expect(page.getByRole('heading', { name: 'Production Orders' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('navigation', { name: 'Production navigation' })).toHaveCount(0);
  await expect(page.getByTestId('worker-order-card-production-order-1')).toHaveCount(0);
  await expect(page.locator('table')).toHaveCount(1);
});
