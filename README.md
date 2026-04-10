# Tilawah (React + Express Proxy)

This project contains:
- `frontend/`: React app powered by Vite
- `backend/`: Express proxy that handles Quran Foundation OAuth2 token fetching and request forwarding

## Why this setup

The Quran OAuth `client_secret` stays on the backend. The frontend calls only:

- `GET /api/quran/*`

The backend adds required headers (`x-auth-token`, `x-client-id`) before forwarding to Quran API.

## Environment variables (`.env`)

Required active keys:

- `QURAN_CLIENT_ID`
- `QURAN_CLIENT_SECRET`
- `QURAN_AUTH_URL`
- `QURAN_API_URL`

Example values for prelive are already present in `.env`.

## Run locally

Install dependencies:

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```

Start frontend + backend together:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3001`

## Backend behavior

- On startup, fetches OAuth2 token from `${QURAN_AUTH_URL}/oauth2/token`
- Uses `grant_type=client_credentials` and `scope=content`
- Caches `access_token` in memory
- Refreshes token 5 minutes before expiry
- Proxies `GET /api/quran/*` to `${QURAN_API_URL}/content/api/v4/*`
- On upstream `401`, clears token, fetches a fresh token, and retries once
