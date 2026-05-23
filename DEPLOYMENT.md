# CodeArena — GitHub & Vercel Deployment

## 1. Push to GitHub

```bash
git add .
git commit -m "Prepare production: sessions, auth, capacity, and Vercel config"
git push origin main
```

## 2. Vercel — Redeploy

1. Open [Vercel Dashboard](https://vercel.com) → your **CodeArena** project.
2. **Settings → Environment Variables** — set every variable from `.env.example` (Production + Preview).
3. **Deployments** → latest deployment → **Redeploy** (enable “Use existing Build Cache” off if issues persist).

### Required environment variables (Production)

| Variable | Notes |
|----------|--------|
| `DB_URL` | MongoDB Atlas connection string |
| `CLERK_SECRET_KEY` | Clerk → API Keys |
| `CLERK_PUBLISHABLE_KEY` | Same as below |
| `VITE_CLERK_PUBLISHABLE_KEY` | Must match Clerk publishable key |
| `STREAM_API_KEY` | Stream dashboard |
| `STREAM_API_SECRET` | Stream dashboard (server only) |
| `VITE_STREAM_API_KEY` | Same as `STREAM_API_KEY` |
| `CLIENT_URL` | `https://your-project.vercel.app` (no trailing slash) |
| `ADMIN_EMAIL` | Your admin Gmail |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail app password for invites |

### Recommended for production

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `VITE_API_URL` | `/api` (or leave unset — default is `/api`) |

Do **not** commit `.env` — it stays local / only in Vercel.

## 3. Clerk production setup

In [Clerk Dashboard](https://dashboard.clerk.com) → your app → **Domains**:

- Add your Vercel URL, e.g. `https://code-arena-lake.vercel.app`
- Set **Home / Sign-in / Sign-up** redirect URLs to that domain

## 4. MongoDB Atlas

- **Network Access** → allow `0.0.0.0/0` (or Vercel IPs) so serverless functions can connect.

## 5. After deploy — quick test

- [ ] Sign in works
- [ ] Dashboard loads active + past sessions
- [ ] Create session + invite email
- [ ] Join session from second account
- [ ] Video call connects

## Build (local check)

```bash
npm install
npm run build
```

Build output: `frontend/dist`
