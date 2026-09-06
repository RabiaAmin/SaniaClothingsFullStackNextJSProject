const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test('admin sees payroll for a custom inclusive range and auditable PO calculations', async ({
  page,
}) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll');

  await expect(page.getByRole('heading', { name: 'Payroll', exact: true })).toBeVisible();
  await page.getByLabel('Start Date').fill('2026-08-26');
  await page.getByLabel('End Date').fill('2026-09-27');
  await expect(page.getByText('Payroll Period')).toBeVisible();
  await expect(page.getByText('26 Aug 2026 — 27 Sep 2026')).toBeVisible();
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
      path: '/payroll/range',
      query: { startDate: '2026-08-26', endDate: '2026-09-27' },
    })
  );
});

test('admin can inspect a server-filtered worker payroll report', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll');
  await page.getByLabel('Start Date').fill('2026-08-26');
  await page.getByLabel('End Date').fill('2026-09-27');

  await page.getByLabel('Worker').click();
  await page.getByRole('option', { name: 'worker', exact: true }).click();

  await expect(
    page.getByRole('row').filter({ hasText: 'PO-1001' }).getByText('40', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('PO-1002', { exact: true })).toHaveCount(0);
  await expect
    .poll(
      () => calls.filter((call) => call.method === 'GET' && call.path === '/payroll/range').length
    )
    .toBeGreaterThan(1);
  expect(calls).toContainEqual(
    expect.objectContaining({
      path: '/payroll/range',
      query: {
        startDate: '2026-08-26',
        endDate: '2026-09-27',
        workerId: 'user-worker',
      },
    })
  );
});

test('admin views, prints, and downloads payroll for the selected worker and date range', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.print = () => {
      window.__payrollPrintCalled = true;
    };
  });
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll');

  const viewButton = page.getByRole('button', { name: 'View Payroll' });
  await expect(viewButton).toBeVisible();
  await expect(viewButton).toBeDisabled();
  await page.getByLabel('Start Date').fill('2026-08-26');
  await page.getByLabel('End Date').fill('2026-09-27');
  await page.getByLabel('Worker').click();
  await page.getByRole('option', { name: 'worker', exact: true }).click();
  await expect(viewButton).toBeEnabled();
  await viewButton.click();

  await expect(page).toHaveURL(/\/payroll\/user-worker\?startDate=2026-08-26&endDate=2026-09-27$/);
  const payrollDocument = page.getByTestId('payroll-view-document');
  await expect(payrollDocument).toContainText('Worker:worker');
  await expect(payrollDocument).toContainText('26 Aug 2026 — 27 Sep 2026');
  await expect(payrollDocument).toContainText('PO-1001');
  await expect(payrollDocument).not.toContainText('PO-1002');
  await expect(payrollDocument).toContainText('600.00');

  await page.getByRole('button', { name: 'Print' }).click();
  await expect.poll(() => page.evaluate(() => window.__payrollPrintCalled)).toBe(true);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('payroll-worker-26-08-2026-to-27-09-2026.pdf');
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'GET',
      path: '/payroll/pdf',
      query: {
        startDate: '2026-08-26',
        endDate: '2026-09-27',
        workerId: 'user-worker',
      },
    })
  );
});

test('All workers remains available on the payroll page without opening an individual view', async ({
  page,
}) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll');
  await page.getByLabel('Start Date').fill('2026-09-01');
  await page.getByLabel('End Date').fill('2026-09-30');

  await expect(page.getByText('PO-1001', { exact: true })).toBeVisible();
  await expect(page.getByText('PO-1002', { exact: true })).toBeVisible();
  await expect(page.getByText(/1,800\.00/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Payroll' })).toBeDisabled();
  expect(calls.some((call) => call.path === '/payroll/pdf')).toBe(false);
});

test('admin can open an individual payroll view for another worker', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll');
  await page.getByLabel('Start Date').fill('2026-09-01');
  await page.getByLabel('End Date').fill('2026-09-30');
  await page.getByLabel('Worker').click();
  await page.getByRole('option', { name: 'worker-two', exact: true }).click();

  await page.getByRole('button', { name: 'View Payroll' }).click();
  const payrollDocument = page.getByTestId('payroll-view-document');
  await expect(payrollDocument).toContainText('Worker:worker-two');
  await expect(payrollDocument).toContainText('PO-1002');
  await expect(payrollDocument).not.toContainText('PO-1001');
  await expect(payrollDocument).toContainText('1,200.00');
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'GET',
      path: '/payroll/pdf',
      query: {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        workerId: 'user-worker-2',
      },
    })
  );
});

test('payroll view shows an invalid-worker state for an unknown worker', async ({ page }) => {
  await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll/unknown-worker?startDate=2026-09-01&endDate=2026-09-30');

  await expect(page.getByText('Worker not found', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
});

test('worker sees only their own approved earnings for the selected range', async ({ page }) => {
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
  await expect(page.getByRole('button', { name: 'View Payroll' })).toHaveCount(0);
  await page.getByLabel('Start Date').fill('2026-08-26');
  await page.getByLabel('End Date').fill('2026-09-27');
  await expect(page.getByLabel('Worker')).toHaveCount(0);
  await expect(page.getByText('PO-1001', { exact: true })).toBeVisible();
  await expect(page.getByText('PO-1002', { exact: true })).toHaveCount(0);
  const payrollCall = calls.find((call) => call.method === 'GET' && call.path === '/payroll/range');
  expect(payrollCall).toBeTruthy();
  expect(payrollCall.query.workerId).toBeUndefined();
});

test('production managers cannot see or directly request payroll PDFs', async ({ page }) => {
  await mockApi(page, {
    user: {
      _id: 'user-production-manager',
      username: 'production-manager',
      email: 'production@sania.test',
      isActive: true,
      mustChangePassword: false,
      role: {
        _id: 'role-production-manager',
        name: 'Production Manager',
        slug: 'production-manager',
      },
      permissions: ['payroll.read_all'],
    },
  });
  await signInAsAdmin(page);
  await page.goto('/payroll');

  await expect(page.getByRole('button', { name: 'View Payroll' })).toHaveCount(0);
  await page.goto('/payroll/user-worker?startDate=2026-08-26&endDate=2026-09-27');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  const response = await page.evaluate(async () => {
    const result = await fetch(
      'http://127.0.0.1:4000/api/v1/payroll/pdf?startDate=2026-08-26&endDate=2026-09-27',
      { credentials: 'include' }
    );
    return { status: result.status, body: await result.json() };
  });
  expect(response.status).toBe(403);
  expect(response.body.message).toMatch(/permission/i);
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
  expect(calls.some((call) => call.path === '/payroll/range')).toBe(false);
});

test('payroll validates reversed, missing, and same-day date ranges', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);
  await page.goto('/payroll');

  await page.getByLabel('End Date').fill('2026-09-20');
  await page.getByLabel('Start Date').fill('2026-09-21');
  await expect(
    page.getByText('Start date cannot be after end date.', { exact: true })
  ).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.path === '/payroll/range' &&
        call.query.startDate === '2026-09-21' &&
        call.query.endDate === '2026-09-20'
    )
  ).toBe(false);

  await page.getByLabel('Start Date').fill('');
  await expect(
    page.getByText('Start date and end date are required.', { exact: true })
  ).toBeVisible();

  await page.getByLabel('Start Date').fill('2026-09-20');
  await expect(page.getByText(/date (?:cannot|are required)/i)).toHaveCount(0);
  await expect
    .poll(() =>
      calls.some(
        (call) =>
          call.path === '/payroll/range' &&
          call.query.startDate === '2026-09-20' &&
          call.query.endDate === '2026-09-20'
      )
    )
    .toBe(true);
});
