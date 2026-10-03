# Docker Desktop Run

This stack runs two containers for local Docker Desktop parity testing:

- `frontend`: Next.js standalone server
- `api`: Express API

MongoDB is not created by Docker Compose. The API uses your external hosted MongoDB through `MONGO_URI`.

## Local Or Lightsail Run

1. Copy the env template:

```bash
cp .env.docker.example .env.docker
```

2. Edit `.env.docker`:

- Set `MONGO_URI` to your hosted MongoDB connection string.
- Keep `FRONTEND_URL` and `CLIENT_URL` as `http://localhost:3000` for Docker Desktop.
- Keep `NEXT_PUBLIC_API_URL` as `http://localhost:4000/api/v1` for Docker Desktop.
- Set `JWT_SECRET`.
- Fill Cloudinary and SMTP values if you need image uploads and password reset emails.
- Create a Google OAuth Web application, enable Google Drive API, and set the four
  `GOOGLE_*` archive values. The redirect URI must exactly match
  `https://your-domain/api/v1/invoice-archives/google/callback` (or the local API URL).

3. Build and start:

```bash
docker compose --env-file .env.docker up -d --build
```

4. Check status:

```bash
docker compose ps
docker compose logs -f api
```

5. Visit:

```txt
http://localhost:3000
```

The API is available directly at:

```txt
http://localhost:4000/api/v1
```

Health check:

```txt
http://localhost:4000/healthz
```

## HTTPS Note

For local Docker Desktop testing over plain HTTP, use:

```env
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

If you later put these containers behind an HTTPS reverse proxy on a VPS, switch to:

```env
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
FRONTEND_URL=https://your-domain.com
CLIENT_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
GOOGLE_OAUTH_REDIRECT_URI=https://your-domain.com/api/v1/invoice-archives/google/callback
```

Generate the token-encryption key outside the repository with `openssl rand -base64 32`. Keep the
OAuth client secret and encryption key server-side, backed up in the deployment secret store, and
never expose either through `NEXT_PUBLIC_*`. Register both the exact local callback
(`http://localhost:4000/api/v1/invoice-archives/google/callback`) and production callback in the
Google Cloud OAuth client. The integration requests only `drive.file`, so it can manage files it
creates without a service account or unrestricted access to the user's Drive.

Then rebuild/restart:

```bash
docker compose --env-file .env.docker up -d --build
```

## Common Commands

```bash
docker compose logs -f
docker compose restart api
docker compose down
```
