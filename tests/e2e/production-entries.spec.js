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

async function recordForWorker(page, { workerName, quantity }) {
  await page.getByRole('button', { name: 'Record Production' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Production order *').click();
  await page.getByRole('option', { name: /^PO-2026-001\b/ }).click();
  await dialog.getByLabel('Worker *').click();
  await page.getByRole('option', { name: workerName, exact: true }).click();
  await expect(dialog.getByText('40 pieces', { exact: true })).toBeVisible();
  await dialog.getByLabel('Production date *').fill('2026-08-23');
  await dialog.getByLabel('Verified quantity *').fill(String(quantity));
  await dialog.getByLabel('Notes').fill('Counted at handover');
  await dialog.getByRole('button', { name: 'Record and approve' }).click();
}

for (const [label, user] of [
  ['Admin', undefined],
  ['Production Manager', productionManagerUser],
]) {
  test(`${label} records verified production for an assigned worker as approved`, async ({
    page,
    isMobile,
  }) => {
    const calls = await mockApi(page, {
      ...(user && { user }),
      assignedWorkerIds: ['user-worker', 'user-worker-2'],
    });
    await signInAsAdmin(page);
    await page.goto('/production-entries');

    await recordForWorker(page, { workerName: 'worker-two', quantity: 15 });

    await expect
      .poll(() =>
        calls.find((call) => call.method === 'POST' && call.path === '/production-entries')
      )
      .toEqual(
        expect.objectContaining({
          payload: {
            productionOrderId: 'production-order-1',
            workerId: 'user-worker-2',
            date: '2026-08-23',
            quantity: 15,
            notes: 'Counted at handover',
          },
        })
      );
    const payload = calls.find(
      (call) => call.method === 'POST' && call.path === '/production-entries'
    ).payload;
    expect(payload.unitRate).toBeUndefined();
    expect(payload.totalAmount).toBeUndefined();
    expect(payload.status).toBeUndefined();

    // The new entry belongs to the selected worker and is already approved. On phones the
    // Production Manager PWA shows entry cards; Admin and larger screens keep the table.
    const row =
      isMobile && user
        ? page.getByTestId('worker-entry-card-production-entry-created')
        : page.getByRole('row').filter({ hasText: 'Counted at handover' });
    await expect(row.getByText('worker-two', { exact: true })).toBeVisible();
    await expect(row.getByText('Approved', { exact: true })).toBeVisible();
    await expect(
      row.getByRole('button', { name: /Approve entry|Reject entry|Edit entry/ })
    ).toHaveCount(0);
  });
}

test('recorded production immediately updates the order remaining quantity', async ({ page }) => {
  await mockApi(page, { assignedWorkerIds: ['user-worker', 'user-worker-2'] });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await recordForWorker(page, { workerName: 'worker', quantity: 10 });
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Record Production' }).click();
  await page.getByRole('dialog').getByLabel('Production order *').click();
  await expect(page.getByRole('option', { name: /^PO-2026-001\b/ })).toContainText('30 remaining');
});

test('record production blocks a quantity above the remaining order quantity', async ({ page }) => {
  const calls = await mockApi(page, { assignedWorkerIds: ['user-worker'] });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await page.getByRole('button', { name: 'Record Production' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Production order *').click();
  await page.getByRole('option', { name: /^PO-2026-001\b/ }).click();
  // A single assigned worker is preselected.
  await expect(dialog.getByLabel('Worker *')).toContainText('worker');
  await dialog.getByLabel('Production date *').fill('2026-08-23');
  await dialog.getByLabel('Verified quantity *').fill('41');
  await dialog.getByRole('button', { name: 'Record and approve' }).click();

  await expect(
    page.getByText('Quantity exceeds the remaining order quantity').first()
  ).toBeVisible();
  expect(calls.some((call) => call.method === 'POST' && call.path === '/production-entries')).toBe(
    false
  );
});

test('record production handles an older order without an item code', async ({ page }) => {
  await mockApi(page, { assignedWorkerIds: ['user-worker'], includeLegacyProductionOrder: true });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await page.getByRole('button', { name: 'Record Production' }).click();
  await page.getByRole('dialog').getByLabel('Production order *').click();
  await expect(page.getByRole('option', { name: /^PO-LEGACY-001\b/ })).toContainText(
    'Item code: Unavailable'
  );
});

test('record production does not offer an order without assigned workers', async ({ page }) => {
  await mockApi(page, { assignedWorkerIds: [] });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await page.getByRole('button', { name: 'Record Production' }).click();
  await page.getByRole('dialog').getByLabel('Production order *').click();
  await expect(page.getByRole('option', { name: /^PO-2026-001\b/ })).toHaveCount(0);
  await expect(page.getByText('No open orders with assigned workers')).toBeVisible();
});

test('managers can record production from the order detail page', async ({ page }) => {
  await mockApi(page, { assignedWorkerIds: ['user-worker'] });
  await signInAsAdmin(page);
  await page.goto('/production-orders/production-order-1');

  await page.getByRole('button', { name: 'Record Production' }).click();
  await expect(page.getByRole('dialog').getByLabel('Production order *')).toContainText(
    'PO-2026-001'
  );
});

test('workers have read-only production history without recording or editing', async ({ page }) => {
  await mockApi(page, { user: workerUser, assignedWorkerIds: ['user-worker'] });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await expect(page.getByRole('heading', { name: 'Production Entries' })).toBeVisible();
  await expect(page.getByText('worker', { exact: true })).toBeVisible();
  await expect(page.getByText('worker-two', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Record Production' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Edit entry/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Approve entry/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Reject entry/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Reverse entry/ })).toHaveCount(0);

  // A direct deep link that used to open the worker submission dialog no longer does.
  await page.goto('/production-entries?record=true');
  await expect(page.getByRole('heading', { name: 'Production Entries' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // The order detail page is viewable but offers no production recording.
  await page.goto('/production-orders/production-order-1');
  await expect(page.getByRole('heading', { name: 'PO-2026-001' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Record Production|Add Work/ })).toHaveCount(0);
});

test('admin can still approve a historical pending worker entry', async ({ page }) => {
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

test('managers can find and record against an open order beyond the first 100', async ({
  page,
}) => {
  const calls = await mockApi(page, { assignedWorkerIds: ['user-worker'], extraOpenOrders: 130 });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await page.getByRole('button', { name: 'Record Production' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('131 matching open orders · page 1 of 7')).toBeVisible();
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog.getByText('131 matching open orders · page 2 of 7')).toBeVisible();

  await dialog.getByLabel('Find order').fill('PO-BULK-125');
  await expect(dialog.getByText('1 matching open order', { exact: true })).toBeVisible();
  await dialog.getByLabel('Production order *').click();
  await page.getByRole('option', { name: /^PO-BULK-125\b/ }).click();
  await expect(dialog.getByLabel('Worker *')).toContainText('worker');
  await dialog.getByLabel('Production date *').fill('2026-08-23');
  await dialog.getByLabel('Verified quantity *').fill('5');
  await dialog.getByRole('button', { name: 'Record and approve' }).click();

  await expect
    .poll(() => calls.find((call) => call.method === 'POST' && call.path === '/production-entries'))
    .toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({ productionOrderId: 'bulk-order-125', quantity: 5 }),
      })
    );
});

test('production date selection is limited to the order start date through today', async ({
  page,
}) => {
  const calls = await mockApi(page, { assignedWorkerIds: ['user-worker'] });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  await page.getByRole('button', { name: 'Record Production' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Production order *').click();
  await page.getByRole('option', { name: /^PO-2026-001\b/ }).click();
  const dateInput = dialog.getByLabel('Production date *');
  const localToday = await page.evaluate(() => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  await expect(dateInput).toHaveAttribute('min', '2026-08-01');
  await expect(dateInput).toHaveAttribute('max', localToday);
  await dialog.getByLabel('Verified quantity *').fill('5');

  // Before the start date and in the future are both blocked before any request is sent.
  for (const invalidDate of ['2026-07-15', '2099-01-01']) {
    await dateInput.fill(invalidDate);
    await dialog.getByRole('button', { name: 'Record and approve' }).click();
    await expect(dialog).toBeVisible();
  }
  expect(calls.some((call) => call.method === 'POST' && call.path === '/production-entries')).toBe(
    false
  );

  // After the due date (2026-08-31) is allowed with a warning, so overdue orders can finish.
  await dateInput.fill('2026-09-05');
  await expect(dialog.getByText(/after the order due date/i)).toBeVisible();
  await dialog.getByRole('button', { name: 'Record and approve' }).click();
  await expect
    .poll(() => calls.find((call) => call.method === 'POST' && call.path === '/production-entries'))
    .toEqual(expect.objectContaining({ payload: expect.objectContaining({ date: '2026-09-05' }) }));
});

test('a manager reverses an approved entry with a reason and records a correction', async ({
  page,
}) => {
  const calls = await mockApi(page, { assignedWorkerIds: ['user-worker', 'user-worker-2'] });
  await signInAsAdmin(page);
  await page.goto('/production-entries');

  // Only the approved entry can be reversed; the pending one cannot.
  await expect(page.getByRole('button', { name: /^Reverse entry/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Reverse entry for PO-2026-001' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Reverse production entry?' })).toBeVisible();

  // The reason is mandatory.
  await dialog.getByRole('button', { name: 'Reverse entry' }).click();
  expect(calls.some((call) => call.path.endsWith('/reverse'))).toBe(false);

  await dialog.getByLabel('Reason for reversal *').fill('Bundle counted twice');
  await dialog.getByRole('button', { name: 'Reverse entry' }).click();
  await expect
    .poll(() => calls.find((call) => call.method === 'PATCH' && call.path.endsWith('/reverse')))
    .toEqual(
      expect.objectContaining({
        path: '/production-entries/production-entry-approved/reverse',
        payload: { reason: 'Bundle counted twice' },
      })
    );
  await expect(dialog.getByRole('heading', { name: 'Entry reversed' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Record corrected entry' }).click();

  // The correction form is prefilled with the original order, worker, and production date.
  const form = page.getByRole('dialog');
  await expect(form.getByLabel('Production order *')).toContainText('PO-2026-001');
  await expect(form.getByLabel('Worker *')).toContainText('worker-two');
  await expect(form.getByLabel('Production date *')).toHaveValue('2026-08-19');
  await form.getByLabel('Verified quantity *').fill('70');
  await form.getByRole('button', { name: 'Record and approve' }).click();
  await expect
    .poll(() => calls.find((call) => call.method === 'POST' && call.path === '/production-entries'))
    .toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          productionOrderId: 'production-order-1',
          workerId: 'user-worker-2',
          date: '2026-08-19',
          quantity: 70,
        }),
      })
    );

  // The original stays on record with its audit trail, next to the linked reversal row.
  const originalRow = page.getByRole('row').filter({ hasText: 'Count verified' });
  await expect(originalRow.getByText('Reversed', { exact: true })).toBeVisible();
  await expect(originalRow.getByText(/Bundle counted twice/)).toBeVisible();
  await expect(originalRow.getByText('80', { exact: true })).toBeVisible();
  const reversalRow = page.getByRole('row').filter({ hasText: 'Reversal: Bundle counted twice' });
  await expect(reversalRow.getByText('Reversal', { exact: true })).toBeVisible();
  await expect(reversalRow.getByText('-80', { exact: true })).toBeVisible();
  // Neither the reversed original nor its reversal can be reversed again.
  await expect(originalRow.getByRole('button', { name: /^Reverse entry/ })).toHaveCount(0);
  await expect(reversalRow.getByRole('button', { name: /^Reverse entry/ })).toHaveCount(0);
});
