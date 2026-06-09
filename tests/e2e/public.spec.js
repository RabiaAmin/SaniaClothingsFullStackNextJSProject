const { test, expect } = require('@playwright/test');
const { mockApi } = require('./support/mockApi');

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('public pages render without application errors', async ({ page }) => {
  const routes = [
    ['/', /Crafted\s+with Precision/i],
    ['/about', /Sania Clothing/i],
    ['/services', /Services/i],
    ['/catalogue', /Product Catalogue/i],
    ['/products', /Product Catalogue/i],
    ['/products/prod-1', /Denim Work Jacket/i],
    ['/contact', /Get in Touch/i],
    ['/login', /Welcome back/i],
    ['/register', /Create an account/i],
    ['/forgot-password', /Forgot your password/i],
    ['/reset-password', /missing a token/i],
  ];

  for (const [route, text] of routes) {
    await page.goto(route);
    await expect(page.getByText(text).first()).toBeVisible();
    await expect(page.getByText(/application error|internal server error/i)).toHaveCount(0);
  }
});

test('catalogue shows products and product detail supports WhatsApp enquiry', async ({ page }) => {
  await page.goto('/catalogue');

  await expect(page.getByRole('heading', { name: 'Product Catalogue' })).toBeVisible();
  await expect(page.getByText('Denim Work Jacket')).toBeVisible();
  await expect(page.getByText('Cotton Utility Shirt')).toBeVisible();

  await page.getByText('Denim Work Jacket').click();
  await expect(page).toHaveURL(/\/products\/prod-1$/);
  await expect(page.getByRole('heading', { name: 'Denim Work Jacket' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Enquire on WhatsApp/i })).toHaveAttribute(
    'href',
    /wa\.me/
  );
});

test('contact form accepts an enquiry', async ({ page }) => {
  await page.goto('/contact');

  await page.getByLabel('Full Name').fill('Test Customer');
  await page.getByLabel('Email Address').fill('customer@example.com');
  await page.getByLabel('Message').fill('Please quote for 100 jackets.');
  await page.getByRole('button', { name: /Send Message/i }).click();

  await expect(page.getByText('Message sent!')).toBeVisible();
  await expect(page.getByText(/we'll be in touch/i)).toBeVisible();
});
