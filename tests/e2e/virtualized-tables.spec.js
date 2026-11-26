const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

// Large, fully loaded lists window their rows; small lists keep rendering every row.

test.beforeEach(async ({ page }) => {
  test.setTimeout(90_000);
  await signInAsAdmin(page);
});

test('CMT Price List windows a large list while search, scrolling and actions still work', async ({
  page,
}) => {
  const calls = await mockApi(page, { extraCmtPrices: 500 });
  await page.goto('/cmt-prices');

  const body = page.locator('tbody[data-virtualized="true"]');
  await expect(body).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('BULK0001', { exact: true })).toBeVisible();
  const renderedRows = await body.locator('tr:not([aria-hidden])').count();
  expect(renderedRows).toBeGreaterThan(0);
  expect(renderedRows).toBeLessThan(100);

  // Scrolling the shell's scroll container brings far rows into the DOM.
  await page.locator('main').evaluate((main) => main.scrollTo(0, main.scrollHeight));
  await expect(page.getByText('BULK0500', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);

  // Search still filters the complete list; a small result renders normally.
  await page.locator('main').evaluate((main) => main.scrollTo(0, 0));
  await page.getByLabel('Search by item code').fill('BULK0499');
  await expect(page.locator('tbody[data-virtualized="true"]')).toHaveCount(0);
  const row = page.getByRole('row', { name: /BULK0499/ });
  await expect(row).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);

  // Row actions remain available on windowed rows.
  await page.getByLabel('Search by item code').fill('');
  await page
    .getByRole('row', { name: /BULK0003/ })
    .getByRole('button')
    .click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(calls.filter((call) => call.method === 'GET' && call.path === '/cmt-prices').length).toBe(
    1
  );
});

test('Clients list windows a large list and keeps small lists unchanged', async ({ page }) => {
  await mockApi(page, { extraClients: 300 });
  await page.goto('/clients');

  const body = page.locator('tbody[data-virtualized="true"]');
  await expect(body).toBeVisible({ timeout: 20_000 });
  expect(await body.locator('tr:not([aria-hidden])').count()).toBeLessThan(100);
  await page.locator('main').evaluate((main) => main.scrollTo(0, main.scrollHeight));
  await expect(page.getByText('Bulk Client 0300', { exact: true })).toBeVisible();

  await page.getByPlaceholder(/search/i).fill('Acme');
  await expect(page.locator('tbody[data-virtualized="true"]')).toHaveCount(0);
  await expect(page.getByText('Acme Retail', { exact: true })).toBeVisible();
});

test('small CMT Price List renders every row without virtualization', async ({ page }) => {
  await mockApi(page);
  await page.goto('/cmt-prices');
  await expect(page.getByText('JK001', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('tbody[data-virtualized="true"]')).toHaveCount(0);
});
