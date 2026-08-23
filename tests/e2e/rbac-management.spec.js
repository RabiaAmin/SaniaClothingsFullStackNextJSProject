const { test, expect } = require('@playwright/test');
const { mockApi, signInAsAdmin } = require('./support/mockApi');

test.beforeEach(async ({ page }) => {
  await signInAsAdmin(page);
});

test('admin can inspect role permissions and assigned users', async ({ page }) => {
  await mockApi(page);
  await page.goto('/roles');

  await expect(page.getByText('invoice.*', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View users assigned to Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Users assigned to Admin' })).toBeVisible();
  await expect(
    page.getByRole('dialog').getByRole('cell', { name: 'admin@sania.test' })
  ).toBeVisible();
});

test('admin can create a database-permission-backed custom role', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/roles');

  await page.getByRole('button', { name: 'Create Role' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Sales Clerk');
  await dialog.getByText('invoice.*', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Create Role', exact: true }).click();

  await expect
    .poll(() => calls.find((call) => call.method === 'POST' && call.path === '/roles'))
    .toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          name: 'Sales Clerk',
          slug: 'sales-clerk',
          permissionIds: expect.arrayContaining(['permission-invoice']),
        }),
      })
    );
});

test('admin can activate a custom role', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/roles');

  await page.getByRole('button', { name: 'Activate Custom Auditor' }).click();
  await page.getByRole('button', { name: 'Activate', exact: true }).click();

  await expect
    .poll(() => calls.find((call) => call.method === 'PUT' && call.path === '/roles/role-auditor'))
    .toEqual(expect.objectContaining({ payload: { isActive: true } }));
});

test('admin can assign or remove a user role from database roles', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/users');

  await page.getByRole('button', { name: 'Manage' }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'No role assigned' }).click();
  await page.getByRole('button', { name: 'Save Access' }).click();

  await expect
    .poll(() => calls.find((call) => call.method === 'PUT' && call.path === '/users/user-1/access'))
    .toEqual(expect.objectContaining({ payload: { roleId: null, isActive: true } }));
});

test('temporary-password user creation forces a one-time password change', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/users');

  await page.getByRole('button', { name: 'Create User' }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('Username').fill('production-worker');
  await createDialog.getByLabel('Email').fill('worker@sania.test');
  await createDialog.getByLabel('Phone').fill('+27 82 555 0444');
  await createDialog.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Worker', exact: true }).click();
  await createDialog.getByRole('button', { name: 'Create User' }).click();

  const credentialsDialog = page.getByRole('dialog');
  await expect(credentialsDialog.getByText('TempWorkerA1!secure', { exact: true })).toBeVisible();
  await expect(credentialsDialog.getByText(/will not be shown again/i)).toBeVisible();
  await credentialsDialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('TempWorkerA1!secure', { exact: true })).toHaveCount(0);

  await page.goto('/login');
  await page.getByLabel('Email address').fill('worker@sania.test');
  await page.getByLabel('Password', { exact: true }).fill('TempWorkerA1!secure');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/change-password$/);
  await expect(page.getByRole('heading', { name: 'Choose your password' })).toBeVisible();

  await page.getByLabel('Current or temporary password').fill('TempWorkerA1!secure');
  await page.getByLabel('New password', { exact: true }).fill('PermanentWorker123');
  await page.getByLabel('Confirm new password').fill('PermanentWorker123');
  await page.getByRole('button', { name: 'Change Password' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'User Access' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Invoice Manager' })).toHaveCount(0);

  const userCallsBeforeDeniedPage = calls.filter(
    (call) => call.method === 'GET' && call.path === '/users'
  ).length;
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  expect(calls.filter((call) => call.method === 'GET' && call.path === '/users')).toHaveLength(
    userCallsBeforeDeniedPage
  );

  await page.goto('/login');
  await page.getByLabel('Email address').fill('worker@sania.test');
  await page.getByLabel('Password', { exact: true }).fill('TempWorkerA1!secure');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Invalid Email Or Password!')).toBeVisible();
});
