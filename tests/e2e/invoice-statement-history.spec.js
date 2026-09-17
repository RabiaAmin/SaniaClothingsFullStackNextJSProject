const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

test('statement history lists saved PDFs and opens the persisted document', async ({ page }) => {
  await mockApi(page);
  await page.goto('/invoices/statements/history');

  await expect(page.getByRole('heading', { name: 'Invoice Statement History' })).toBeVisible();
  const row = page.getByRole('row', { name: /STMT-20260917-ABC12345/ });
  await expect(row).toContainText('1');
  await expect(row).toContainText('admin');
  await expect(row.getByRole('button', { name: /edit/i })).toHaveCount(0);

  await row.getByRole('link', { name: 'View STMT-20260917-ABC12345' }).click();
  await expect(page).toHaveURL(/\/invoices\/statements\/history\/statement-history-1$/);
  await expect(page.getByTitle('Saved statement STMT-20260917-ABC12345')).toHaveAttribute(
    'src',
    'https://example.test/saved-statement.pdf',
    { timeout: 15_000 }
  );
  await expect(page.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
    'href',
    'https://example.test/saved-statement.pdf'
  );
});

test('deleting history removes the saved statement without invoice requests', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/invoices/statements/history');

  await page.getByRole('button', { name: 'Delete STMT-20260917-ABC12345' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No statement history')).toBeVisible();

  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'DELETE',
      path: '/business/invoice/statement-history/statement-history-1',
    })
  );
  expect(
    calls.some(
      (call) => call.method === 'DELETE' && call.path.startsWith('/business/invoice/delete/')
    )
  ).toBe(false);
});

test('read-only invoice access can view history but cannot see delete actions', async ({
  page,
}) => {
  await mockApi(page, {
    user: {
      _id: 'user-invoice-reader',
      username: 'invoice-reader',
      email: 'reader@sania.test',
      isActive: true,
      role: { _id: 'role-reader', name: 'Invoice Reader', slug: 'invoice-reader' },
      permissions: ['invoice.read'],
    },
  });
  await page.goto('/invoices/statements/history');

  await expect(page.getByRole('heading', { name: 'Invoice Statement History' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View STMT-20260917-ABC12345' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete STMT-20260917-ABC12345' })).toHaveCount(0);
});
