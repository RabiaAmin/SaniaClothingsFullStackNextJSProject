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
  await expect(navigation.getByRole('link', { name: 'Earnings' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Record Production' })).toBeVisible();
  await expect(
    page.getByLabel('Available Orders').getByText('Available production orders')
  ).toBeVisible();
  await expect(page.getByTestId('worker-order-card-production-order-1')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('table:visible')).toHaveCount(0);

  await navigation.getByRole('link', { name: 'My Work' }).click();
  await expect(page).toHaveURL(/\/production-entries$/, { timeout: 30_000 });
  await expect(page.getByTestId('worker-entry-card-production-entry-pending')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('Item code: JK001', { exact: true })).toBeVisible();
  await expect(page.locator('table:visible')).toHaveCount(0);
});

test('worker records production from a preselected mobile order card', async ({ page }) => {
  const calls = await mockApi(page, { user: workerUser });
  await page.goto('/production-orders');

  const orderCard = page.getByTestId('worker-order-card-production-order-1');
  await orderCard.getByRole('button', { name: 'Add Work' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('combobox').first()).toContainText(
    'PO-2026-001 - Navy work jackets for winter delivery'
  );
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
  await expect(page).toHaveURL(/\/production-entries$/, { timeout: 30_000 });
});

test('worker mobile history uses cards with accessible statuses and account access', async ({
  page,
}) => {
  await mockApi(page, { user: workerUser });
  await page.goto('/production-entries');

  const entryCard = page.getByTestId('worker-entry-card-production-entry-pending');
  await expect(entryCard).toBeVisible();
  await expect(entryCard.getByText('PO-2026-001', { exact: true })).toBeVisible();
  await expect(entryCard.getByText('Item code: JK001', { exact: true })).toBeVisible();
  await expect(entryCard.getByText('Navy work jackets for winter delivery')).toBeVisible();
  await expect(entryCard.getByText('Pending', { exact: true })).toBeVisible();
  await expect(entryCard.getByText('30 pieces', { exact: true })).toBeVisible();
  await expect(page.locator('table:visible')).toHaveCount(0);

  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByRole('menuitem', { name: 'Change Password' }).click();
  await expect(page).toHaveURL(/\/password$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Password Manager' })).toBeVisible();
});

test('worker mobile earnings use approved-work cards instead of a dense table', async ({
  page,
}) => {
  await mockApi(page, { user: workerUser });
  await page.goto('/payroll');

  await expect(page.getByRole('heading', { name: 'My Earnings' })).toBeVisible();
  await expect(page.getByText('My approved work')).toBeVisible();
  const earningsCard = page.getByRole('article');
  await expect(earningsCard.getByText('PO-1001', { exact: true })).toBeVisible();
  await expect(earningsCard.getByText('Earned', { exact: true })).toBeVisible();
  await expect(page.locator('table:visible')).toHaveCount(0);
});

test('worker earnings metrics contain long currency values at responsive widths', async ({
  page,
}) => {
  await mockApi(page, {
    user: workerUser,
    payrollEntryQuantity: 100,
    payrollEntryRate: 22,
    payrollEntryAmount: 2_200_000,
  });

  const mobileWidths = [320, 360, 375, 390, 412, 430];
  for (const width of mobileWidths) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/payroll');

    const metrics = page.getByTestId('worker-earnings-metrics');
    const earned = page.getByTestId('worker-earned-value');
    await expect(metrics).toBeVisible();
    await expect(metrics.getByText('100', { exact: true })).toBeVisible();
    await expect(metrics.getByText('ZAR 22.00', { exact: true })).toBeVisible();
    await expect(earned).toHaveText('ZAR 2,200,000.00');
    expect(await earned.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    ).toBe(true);
  }

  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId('worker-earnings-metrics')).toBeHidden();
    await expect(page.locator('table:visible')).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    ).toBe(true);
  }
});
