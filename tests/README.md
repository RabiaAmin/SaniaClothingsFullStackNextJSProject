# Test Suite

This project uses Playwright for end-to-end browser tests.

## Covered Areas

- Public pages: home, about, services, catalogue/products, product detail, contact, auth pages.
- Auth behavior: protected admin redirect, login submission, admin session loading.
- Admin areas: dashboard, invoices, statements, clients, business profile, bank accounts, password manager, product manager.
- API wiring: mocked API responses cover all frontend feature areas, including the corrected `/user/update/password` route.

## Run

```bash
npm install
npx playwright install
npm run test:e2e
```

Use the interactive runner with:

```bash
npm run test:e2e:ui
```
