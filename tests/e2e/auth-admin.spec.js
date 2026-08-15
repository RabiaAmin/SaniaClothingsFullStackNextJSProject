const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test('protected admin pages redirect unauthenticated users to login', async ({ page }) => {
  await mockApi(page);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('login submits credentials and opens the dashboard', async ({ page }) => {
  const calls = await mockApi(page);

  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@sania.test');
  await page.getByLabel('Password').fill('Password123');
  await page.getByRole('button', { name: /^Sign in$/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'POST',
      path: '/user/login',
      payload: { email: 'admin@sania.test', password: 'Password123' },
    })
  );
});

test('forgot password and reset password call the expected auth endpoints', async ({ page }) => {
  const calls = await mockApi(page);

  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('admin@sania.test');
  await page.getByRole('button', { name: /Send reset link/i }).click();
  await expect(page.getByText(/check your inbox/i)).toBeVisible();

  await page.goto('/reset-password?token=reset-token');
  await page.getByLabel('New password').fill('NewPassword123');
  await page.getByLabel('Confirm new password').fill('NewPassword123');
  await page.getByRole('button', { name: /Update password/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'POST',
      path: '/user/password/forgot',
      payload: { email: 'admin@sania.test' },
    })
  );
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'PUT',
      path: '/user/password/reset/reset-token',
      payload: { password: 'NewPassword123', confirmPassword: 'NewPassword123' },
    })
  );
});

test('signed-in admin feature pages render with mocked data', async ({ page }) => {
  await mockApi(page);
  await signInAsAdmin(page);

  const routes = [
    ['/dashboard', 'Dashboard'],
    ['/invoices', 'Invoice Manager'],
    ['/invoices/create', 'Create Invoice'],
    ['/invoices/statements', 'Invoice Statements'],
    ['/clients', 'Client Manager'],
    ['/business', 'Business Profile'],
    ['/bank-accounts', 'Bank Account Manager'],
    ['/password', 'Password Manager'],
    ['/admin/products', 'Product Manager'],
  ];

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByText(/application error|internal server error/i)).toHaveCount(0);
  }
});

test('password manager calls the corrected update/password endpoint', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);

  await page.goto('/password');
  await page.getByLabel('Current Password').fill('OldPassword123');
  await page.getByLabel('New Password').fill('NewPassword123');
  await page.getByLabel('Confirm New Password').fill('NewPassword123');
  await page.getByRole('button', { name: /Update Password/i }).click();

  await expect(page.getByText('Password updated successfully.')).toBeVisible();
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'PUT',
      path: '/user/update/password',
      payload: {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmNewPassword: 'NewPassword123',
      },
    })
  );
  expect(calls.find((call) => call.path.includes('pawssord'))).toBeUndefined();
});

test('client manager can open the add-client flow and submit a client', async ({ page }) => {
  const calls = await mockApi(page);
  await signInAsAdmin(page);

  await page.goto('/clients');
  await page.getByRole('button', { name: /Add Client/i }).first().click();
  await page.getByPlaceholder('Ahmed Enterprises').fill('New Fashion Buyer');
  await page.getByRole('dialog').getByRole('button', { name: /Add Client/i }).click();

  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'POST',
      path: '/client/add',
      payload: expect.objectContaining({ name: 'New Fashion Buyer' }),
    })
  );
});
