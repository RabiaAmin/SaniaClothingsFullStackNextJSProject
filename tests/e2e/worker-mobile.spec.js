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
    'payroll.read_own',
  ],
};

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Worker mobile presentation is exercised by the mobile project.');
  test.setTimeout(60_000);
  await signInAsAdmin(page);
});

test('worker mobile dashboard and navigation prioritize daily work', async ({ page }) => {
  await mockApi(page, { user: workerUser });
  await page.goto('/dashboard');

  const navigation = page.getByRole('navigation', { name: 'Worker navigation' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'My Work' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Add Work' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Profile' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Record Production' })).toBeVisible();
  await expect(
    page.getByLabel('Available Orders').getByText('Available production orders')
  ).toBeVisible();
  await expect(page.getByTestId('worker-order-card-production-order-1')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('table:visible')).toHaveCount(0);

  await navigation.getByRole('link', { name: 'My Work' }).click();
  await expect(page).toHaveURL(/\/production-orders$/);
  await expect(page.getByTestId('worker-order-card-production-order-1')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('JK001', { exact: true })).toBeVisible();
  await expect(page.getByText('40 remaining', { exact: true })).toBeVisible();
  await expect(page.locator('table:visible')).toHaveCount(0);
});

test('worker records production from a preselected mobile order card', async ({ page }) => {
  const calls = await mockApi(page, { user: workerUser });
  await page.goto('/production-orders');

  const orderCard = page.getByTestId('worker-order-card-production-order-1');
  await orderCard.getByRole('button', { name: 'Add Work' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('combobox').first()).toContainText('PO-2026-001 - JK001');
  await page.getByLabel('Production date *').fill('2026-08-23');
  await page.getByLabel('Pieces produced *').fill('20');
  await page.getByRole('button', { name: 'Submit for review' }).click();

  await expect
    .poll(() => calls.find((call) => call.method === 'POST' && call.path === '/production-entries'))
    .toEqual(
      expect.objectContaining({
        payload: {
          productionOrderId: 'production-order-1',
          date: '2026-08-23',
          quantity: 20,
          notes: '',
        },
      })
    );
});

test('worker mobile history uses cards with accessible statuses and profile access', async ({
  page,
}) => {
  await mockApi(page, { user: workerUser });
  await page.goto('/production-entries');

  const entryCard = page.getByTestId('worker-entry-card-production-entry-pending');
  await expect(entryCard).toBeVisible();
  await expect(entryCard.getByText('PO-2026-001', { exact: true })).toBeVisible();
  await expect(entryCard.getByText('JK001', { exact: true })).toBeVisible();
  await expect(entryCard.getByText('Pending', { exact: true })).toBeVisible();
  await expect(entryCard.getByText('30 pieces', { exact: true })).toBeVisible();
  await expect(page.locator('table:visible')).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'Worker navigation' })
    .getByRole('link', { name: 'Profile' })
    .click({ force: true });
  await expect(page).toHaveURL(/\/password$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Password Manager' })).toBeVisible();
});
