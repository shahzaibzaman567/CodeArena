# CORS Fix & Vercel Deployment Prep — TODO

## Steps
- [x] Step 1: Update `backend/src/server.js`
  - Robust CORS with explicit origin reflection
  - Manual CORS fallback middleware
  - Global error handler with CORS headers
  - Conditional `listen()` for local dev only (serverless-safe)
  - Immediate `connectDB()` for cold-start resilience
- [x] Step 2: Fix `backend/vercel.json`
  - Correct rewrite path from `/backend/src/server.js` → `/src/server.js`
  - Removed invalid `*` + `credentials: true` CORS headers
- [x] Step 3: Update `backend/src/lib/socket.js`
  - Parse comma-separated `CLIENT_URL` for multiple origins
  - Dynamic origin callback instead of static string
- [x] Step 4: Create `frontend/.env.example`
  - Document required `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_STREAM_API_KEY`
- [x] Step 5: Verify and mark complete.



