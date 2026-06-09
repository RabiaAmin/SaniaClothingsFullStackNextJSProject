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
```

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
