const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

const workerUser = {
  _id: 'user-worker',
  username: 'worker',
  email: 'worker@sania.test',
  isActive: true,
  mustChangePassword: false,
  role: { _id: 'role-worker', name: 'Worker', slug: 'worker' },
  permissions: [
    'production_order.read',
    'production_entry.create',
    'production_entry.read_own',
    'production_entry.update_own',
  ],
};

test('worker submits production for themselves with a server-owned rate snapshot', async ({
  page,
}) => {
  const calls = await mockApi(page, { user: workerUser });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await expect(page.getByRole('heading', { name: 'Production Entries' })).toBeVisible();
  await page.getByRole('button', { name: 'Record Production' }).click();
  await page.getByRole('combobox').nth(0).click();
  await page.getByRole('option', { name: 'PO-2026-001 - JK001' }).click();
  await expect(page.getByText(/12\.50 per piece/)).toBeVisible();
  await page.getByLabel('Production date *').fill('2026-08-23');
  await page.getByLabel('Pieces produced *').fill('20');
  await page.getByLabel('Notes').fill('Afternoon run');
  await page.getByRole('button', { name: 'Submit for review' }).click();

  await expect
    .poll(() => calls.find((call) => call.method === 'POST' && call.path === '/production-entries'))
    .toEqual(
      expect.objectContaining({
        payload: {
          productionOrderId: 'production-order-1',
          date: '2026-08-23',
          quantity: 20,
          notes: 'Afternoon run',
        },
      })
    );
  const payload = calls.find(
    (call) => call.method === 'POST' && call.path === '/production-entries'
  ).payload;
  expect(payload.workerId).toBeUndefined();
  expect(payload.unitRate).toBeUndefined();
  expect(payload.totalAmount).toBeUndefined();
});

test('record production handles an older order without an item code', async ({ page }) => {
  await mockApi(page, { user: workerUser, includeLegacyProductionOrder: true });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await page.getByRole('button', { name: 'Record Production' }).click();
  await page.getByRole('combobox').nth(0).click();
  await expect(
    page.getByRole('option', { name: 'PO-LEGACY-001 - Item code unavailable' })
  ).toBeVisible();
});

test('worker sees only their own pending entry and cannot approve it', async ({ page }) => {
  await mockApi(page, { user: workerUser });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await expect(page.getByText('worker-two', { exact: true })).toHaveCount(0);
  await expect(page.getByText('worker', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit entry/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Approve entry/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Reject entry/ })).toHaveCount(0);
});

test('admin approves a worker entry and the approval endpoint is used', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await page.getByRole('button', { name: 'Approve entry for PO-2026-001' }).click();
  await expect(page.getByRole('heading', { name: 'Approve production entry?' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve entry', exact: true }).click();

  await expect
    .poll(() =>
      calls.find(
        (call) =>
          call.method === 'PATCH' &&
          call.path === '/production-entries/production-entry-pending/approve'
      )
    )
    .toBeTruthy();
});

test('approval displays a backend error when only 40 pieces remain but 50 are claimed', async ({
  page,
}) => {
  const calls = await mockApi(page, { productionEntryQuantity: 50 });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await page.getByRole('button', { name: 'Approve entry for PO-2026-001' }).click();
  await page.getByRole('button', { name: 'Approve entry', exact: true }).click();

  await expect(page.getByText(/exceeds the remaining quantity/i).first()).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.method === 'PATCH' &&
        call.path === '/production-entries/production-entry-pending/approve'
    )
  ).toBe(true);
});

test('invoice manager cannot see or access production entries', async ({ page }) => {
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
  await expect(page.getByRole('link', { name: 'Production Entries' })).toHaveCount(0);

  await page.goto('/production-entries');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});
