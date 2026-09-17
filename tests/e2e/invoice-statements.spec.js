const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test.describe.configure({ mode: 'serial' });
test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

test('manual statement selection sends only checked invoice IDs', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/invoices/statements');

  const generate = page.getByRole('button', { name: 'Generate Statement' });
  await expect(generate).toBeDisabled();
  await expect(page.getByText('0 invoices selected')).toBeVisible();
  expect(calls.some((call) => call.path === '/business/invoice/weekly-statements')).toBe(false);

  await page.getByRole('checkbox', { name: 'Select invoice 1001' }).check();
  await expect(page.getByText('1 invoice selected')).toBeVisible();
  await generate.click();

  await expect(page.getByText('Generated statements')).toBeVisible();
  await expect(page.getByRole('row', { name: /^Acme Retail / })).toContainText('1');
  await expect(page.getByRole('row', { name: /^Boutique House / })).toHaveCount(0);
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'POST',
      path: '/business/invoice/weekly-statements',
      payload: { invoiceIds: ['invoice-1'] },
    })
  );
});

test('select all selects displayed invoices and generated views retain only that selection', async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto('/invoices/statements');

  await page.getByRole('checkbox', { name: 'Select all invoices on this page' }).check();
  await expect(page.getByText('2 invoices selected')).toBeVisible();
  await page.getByRole('button', { name: 'Generate Statement' }).click();

  await expect(page.getByRole('row', { name: /^Acme Retail / })).toBeVisible();
  await expect(page.getByRole('row', { name: /^Boutique House / })).toBeVisible();
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'POST',
      path: '/business/invoice/weekly-statements',
      payload: { invoiceIds: ['invoice-1', 'invoice-2'] },
    })
  );

  await page
    .getByRole('row', { name: /^Acme Retail / })
    .getByRole('link', { name: 'View' })
    .click();
  await expect(page).toHaveURL(/\/invoices\/statements\/view\?/);
  await expect(page.locator('#statement-print').getByText('1001')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#statement-print').getByText('1002')).toHaveCount(0);
});

test('downloading a generated statement persists its PDF and selected invoice IDs', async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto('/invoices/statements');

  await page.getByRole('checkbox', { name: 'Select invoice 1001' }).check();
  await page.getByRole('button', { name: 'Generate Statement' }).click();
  await page
    .getByRole('row', { name: /^Acme Retail / })
    .getByRole('link', { name: 'View' })
    .click();
  await expect(page.locator('#statement-print')).toBeVisible({ timeout: 15_000 });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('statement-Acme-Retail.pdf');
  expect(
    calls.some(
      (call) =>
        call.method === 'POST' &&
        call.path === '/business/invoice/statement-history' &&
        typeof call.payload === 'string' &&
        call.payload.includes('invoice-1')
    )
  ).toBe(true);
});
