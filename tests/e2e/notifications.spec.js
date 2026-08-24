const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

test('notification indicator shows unread production activity and marks an item read', async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto('/dashboard');

  const indicator = page.getByRole('button', { name: /Notifications, 1 unread/i });
  await expect(indicator).toBeVisible();
  await indicator.click();
  await expect(page.getByText('worker submitted 40 pieces for PO-2026-001.')).toBeVisible();

  await page.getByText('worker submitted 40 pieces for PO-2026-001.').click();
  await expect(page).toHaveURL(/\/production-entries$/);
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'PATCH',
      path: '/notifications/notification-submitted/read',
    })
  );
});

test('notification page filters unread items and marks all notifications read', async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto('/notifications');

  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByText('Your production entry of 80 pieces')).toBeVisible();
  await page.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(page.getByText('worker submitted 40 pieces for PO-2026-001.')).toBeVisible();
  await expect(page.getByText('Your production entry of 80 pieces')).toHaveCount(0);

  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect
    .poll(() =>
      calls.some((call) => call.method === 'PATCH' && call.path === '/notifications/read-all')
    )
    .toBe(true);
});

test('notification page has an empty state', async ({ page }) => {
  await mockApi(page, { notificationEmpty: true });
  await page.goto('/notifications');

  await expect(page.getByText('No notifications yet')).toBeVisible();
});
