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
    'payroll.read_own',
  ],
};

async function dispatchInstallPrompt(page, outcome = 'accepted') {
  await expect
    .poll(
      () =>
        page.evaluate((selectedOutcome) => {
          const event = new Event('beforeinstallprompt', { cancelable: true });
          event.prompt = async () => {
            window.__installPromptCalls = (window.__installPromptCalls ?? 0) + 1;
          };
          Object.defineProperty(event, 'userChoice', {
            value: Promise.resolve({ outcome: selectedOutcome, platform: 'web' }),
          });
          window.dispatchEvent(event);
          return event.defaultPrevented;
        }, outcome),
      { message: 'PWA registrar is ready to capture the install prompt' }
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(60_000);
  await signInAsAdmin(page);
});

test('Worker can accept the captured Chromium installation prompt', async ({ page }) => {
  await mockApi(page, { user: workerUser });
  await page.goto('/dashboard');
  await expect(page.getByTestId('worker-dashboard')).toBeVisible();
  await dispatchInstallPrompt(page, 'accepted');

  const card = page.getByTestId('worker-install-card');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Install App' }).click();

  await expect.poll(() => page.evaluate(() => window.__installPromptCalls ?? 0)).toBe(1);
  await expect(card).toHaveCount(0);
});

test('a dismissed Chromium prompt stays hidden for the session', async ({ page }) => {
  await mockApi(page, { user: workerUser });
  await page.goto('/dashboard');
  await expect(page.getByTestId('worker-dashboard')).toBeVisible();
  await dispatchInstallPrompt(page, 'dismissed');

  const card = page.getByTestId('worker-install-card');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Install App' }).click();
  await expect(card).toHaveCount(0);

  await dispatchInstallPrompt(page, 'accepted');
  await expect(card).toHaveCount(0);
});

test('appinstalled hides a visible Worker installation card', async ({ page }) => {
  await mockApi(page, { user: workerUser });
  await page.goto('/dashboard');
  await expect(page.getByTestId('worker-dashboard')).toBeVisible();
  await dispatchInstallPrompt(page);

  const card = page.getByTestId('worker-install-card');
  await expect(card).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(card).toHaveCount(0);
});

test('standalone Workers and non-Workers do not see installation UI', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'standalone', { configurable: true, value: true });
  });
  await mockApi(page, { user: workerUser });
  await page.goto('/dashboard');
  await expect(page.getByTestId('worker-dashboard')).toBeVisible();
  await dispatchInstallPrompt(page);
  await expect(page.getByTestId('worker-install-card')).toHaveCount(0);

  await mockApi(page);
  await page.goto('/dashboard');
  await expect(page.getByTestId('worker-dashboard')).toHaveCount(0);
  await expect(page.getByTestId('worker-install-card')).toHaveCount(0);
});

test('iPhone Workers receive short Safari Home Screen instructions', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    });
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'iPhone',
    });
  });
  await mockApi(page, { user: workerUser });
  await page.goto('/dashboard');
  await expect(page.getByTestId('worker-dashboard')).toBeVisible();

  const card = page.getByTestId('worker-install-card');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Install App' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Install Sania Clothing' })).toBeVisible();
  await expect(dialog.getByText('Tap the Share button')).toBeVisible();
  await expect(dialog.getByText('Choose Add to Home Screen.')).toBeVisible();
});
