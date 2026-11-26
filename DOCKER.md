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
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f api
```

Compose reads `.env.docker` only when `--env-file .env.docker` is passed; it does not load that
file automatically. Pass the flag on **every** command against `docker-compose.yml`, including
`ps`, `logs`, `restart`, and `down`, because each command re-validates the required variables.

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
docker compose --env-file .env.docker logs -f
docker compose --env-file .env.docker restart api
docker compose --env-file .env.docker down
```

## Troubleshooting: `required variable ... is missing a value`

`docker-compose.yml` marks `JWT_SECRET` and the four `GOOGLE_*` archive values as required
(`${VAR:?message}`). Compose stops at the **first** missing or empty value, in file order, so
the error names only one variable at a time. `.env.docker` is git-ignored, so the server keeps
its own copy and does not receive new variables through `git pull`.

| Error names | Usual cause |
| --- | --- |
| `JWT_SECRET` | `--env-file .env.docker` was not passed, or the command ran from another directory. |
| `GOOGLE_OAUTH_CLIENT_ID` | The server's `.env.docker` predates the invoice-archive feature and has no `GOOGLE_*` lines. |
| `GOOGLE_OAUTH_REDIRECT_URI` (or another single `GOOGLE_*`) | That line is missing, empty, commented out, or misspelled (for example `..._URL`). |

A variable exported in the server shell takes precedence over `.env.docker`, so an empty export
(`export GOOGLE_OAUTH_REDIRECT_URI=`) also triggers the error. Check with `env | grep GOOGLE_`
and remove it with `unset`.

Before starting, check the configuration without printing secrets:

```bash
docker compose --env-file .env.docker config --quiet && echo "compose config OK"
docker compose --env-file .env.docker config | grep GOOGLE_OAUTH_REDIRECT_URI
```

The redirect URI is not a secret, but the client secret and encryption key are, so do not paste
full `config` output into tickets or chat.
