const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test('admin sees the overall monthly payroll and auditable PO calculations', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll');

  await expect(page.getByRole('heading', { name: 'Monthly Payroll' })).toBeVisible();
  await expect(page.getByText('140', { exact: true })).toBeVisible();
  await expect(page.getByText(/1,800\.00/)).toBeVisible();
  await expect(page.getByText('PO-1001', { exact: true })).toBeVisible();
  await expect(page.getByText('PO-1002', { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'PO-1001' })
      .getByText(/600\.00/)
  ).toBeVisible();
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'PO-1002' })
      .getByText(/1,200\.00/)
  ).toBeVisible();
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'GET',
      path: '/payroll/monthly',
      query: { year: '2026', month: '8' },
    })
  );
});

test('admin can inspect a server-filtered worker payroll report', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll');

  await page.getByLabel('Worker').click();
  await page.getByRole('option', { name: 'worker', exact: true }).click();

  await expect(
    page.getByRole('row').filter({ hasText: 'PO-1001' }).getByText('40', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('PO-1002', { exact: true })).toHaveCount(0);
  await expect
    .poll(
      () => calls.filter((call) => call.method === 'GET' && call.path === '/payroll/monthly').length
    )
    .toBeGreaterThan(1);
  expect(calls).toContainEqual(
    expect.objectContaining({
      path: '/payroll/monthly',
      query: { year: '2026', month: '8', workerId: 'user-worker' },
    })
  );
});

test('worker sees only their own approved monthly earnings', async ({ page }) => {
  const calls = await mockApi(page, {
    user: {
      _id: 'user-worker',
      username: 'worker',
      email: 'worker@sania.test',
      isActive: true,
      mustChangePassword: false,
      role: { _id: 'role-worker', name: 'Worker', slug: 'worker' },
      permissions: ['production_order.read', 'production_entry.read_own', 'payroll.read_own'],
    },
  });
  await signInAsAdmin(page);
  await page.goto('/payroll');

  await expect(page.getByRole('heading', { name: 'My Earnings' })).toBeVisible();
  await expect(page.getByLabel('Worker')).toHaveCount(0);
  await expect(page.getByText('PO-1001', { exact: true })).toBeVisible();
  await expect(page.getByText('PO-1002', { exact: true })).toHaveCount(0);
  const payrollCall = calls.find(
    (call) => call.method === 'GET' && call.path === '/payroll/monthly'
  );
  expect(payrollCall).toBeTruthy();
  expect(payrollCall.query.workerId).toBeUndefined();
});

test('invoice manager cannot navigate to or access payroll', async ({ page }) => {
  const calls = await mockApi(page, {
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
  await expect(page.getByRole('link', { name: 'Earnings & Payroll' })).toHaveCount(0);

  await page.goto('/payroll');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  expect(calls.some((call) => call.path === '/payroll/monthly')).toBe(false);
});
