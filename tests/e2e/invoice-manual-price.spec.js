const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
  await mockApi(page);
});

test('invoices combine CMT-priced and manually priced unregistered items', async ({ page }) => {
  await page.goto('/invoices/create');

  await page.getByRole('combobox').filter({ hasText: 'Select client' }).click();
  await page.getByRole('option', { name: /Acme Retail/ }).click();
  await page.getByRole('combobox').filter({ hasText: 'Select category' }).click();
  await page.getByRole('option', { name: 'CMT Services' }).click();
  await page.getByPlaceholder('PO-2026-001').fill('PO-MANUAL-1');

  const codes = page.getByPlaceholder('Description');
  const prices = page.getByLabel('Unit price');
  const notFound = page.getByText(
    'Item code not found in CMT Price List. Enter the unit price manually.'
  );

  // Registered Item Code: price comes from the CMT Price List and stays read-only.
  await codes.nth(0).fill('jk001');
  await codes.nth(0).blur();
  await expect(prices.nth(0)).toHaveValue('25');
  await expect(prices.nth(0)).toHaveAttribute('readonly', '');

  // Switching to an unregistered code clears the old price and makes it editable.
  await codes.nth(0).fill('CUSTOM-C');
  await codes.nth(0).blur();
  await expect(notFound).toBeVisible();
  await expect(prices.nth(0)).toHaveValue('');
  await expect(prices.nth(0)).not.toHaveAttribute('readonly', '');

  // Switching back restores the CMT price and read-only state.
  await codes.nth(0).fill('jk001');
  await codes.nth(0).blur();
  await expect(prices.nth(0)).toHaveValue('25');
  await expect(prices.nth(0)).toHaveAttribute('readonly', '');
  await page.locator('input[type="number"][min="1"]').nth(0).fill('2');

  // A second, unregistered line takes a manual price; changing to another unknown code clears it.
  await page.getByRole('button', { name: 'Add line' }).click();
  await codes.nth(1).fill('custom-a');
  await codes.nth(1).blur();
  await prices.nth(1).fill('12.5');
  await codes.nth(1).blur();
  await expect(prices.nth(1)).toHaveValue('12.5');
  await codes.nth(1).fill('custom-b');
  await expect(prices.nth(1)).toHaveValue('');
  await codes.nth(1).blur();
  await prices.nth(1).fill('7');
  await page.locator('input[type="number"][min="1"]').nth(1).fill('3');

  // Re-checking the same unknown code keeps the manually entered price.
  await codes.nth(1).focus();
  await codes.nth(1).blur();
  await expect(notFound).toBeVisible();
  await expect(prices.nth(1)).toHaveValue('7');

  const createRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().includes('/business/invoice/create')
  );
  await page.getByRole('button', { name: 'Create Invoice' }).click();
  const payload = (await createRequest).postDataJSON();

  expect(payload.items).toEqual([
    { description: 'JK001', quantity: 2, unitPrice: 25, amount: 50 },
    { description: 'custom-b', quantity: 3, unitPrice: 7, amount: 21 },
  ]);
  expect(payload.subTotal).toBe(71);
});
