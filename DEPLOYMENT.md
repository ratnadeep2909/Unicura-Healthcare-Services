# UniCura Deployment Guide

## Architecture

- Frontend: Vercel
- Backend API: Render
- Database: MongoDB

The frontend keeps calling `/api/...` on the same origin. On Vercel, the function at `api/[...path].mjs` forwards those requests to your Render backend using the `RENDER_BACKEND_URL` environment variable.

## 1. Deploy the backend on Render

1. Push this repository to GitHub.
2. In Render, create a new `Web Service` from the repository.
3. Render can read [`render.yaml`](./render.yaml), or you can enter the same settings manually:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add the environment variables from [`.env.example`](./.env.example).
5. Set `APP_BASE_URL` to your Vercel frontend URL, not the Render URL.
   - Example: `https://your-project.vercel.app`
6. After deployment, copy the Render service URL.
   - Example: `https://unicura-backend.onrender.com`

## 2. Deploy the frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Framework preset: `Other`
3. Root directory: `.`
4. Add this environment variable in Vercel:
   - `RENDER_BACKEND_URL=https://your-render-service.onrender.com`
5. Deploy.

## 3. Required environment variables

### Render

Add these values on Render:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `APP_BASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `UNICURA_ENCRYPTION_KEY`
- `UNICURA_TOKEN_SECRET`
- `UNICURA_LOOKUP_SECRET`

### Vercel

Add this value on Vercel:

- `RENDER_BACKEND_URL`

## 4. Important notes

- The backend already listens on `process.env.PORT`, which matches Render's web service model.
- The backend currently allows CORS from any origin, so direct frontend calls will also work if needed.
- HTML files now need the shared `site-api.js` script tag at build time because Vercel serves static files directly and does not run your local `server.js` HTML injection logic.
- If you use a free Render web service, outbound SMTP on ports `25`, `465`, and `587` is blocked. For this project, that means email notifications can fail unless you use a paid Render instance or switch to an email provider/setup that avoids those blocked ports.

## 5. Smoke test after deploy

1. Open the Vercel site.
2. Visit `/api/health` on the Vercel domain.
   - It should return the health response from Render through the proxy.
3. Submit one contact form or appointment form.
4. Confirm data reaches MongoDB and any email flow works if SMTP is configured.
