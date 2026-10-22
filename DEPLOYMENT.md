# Deployment Guide - Workspace Dashboard Hub

The project is structured with dedicated `frontend/` and `backend/` folders so you can deploy them separately (e.g. Frontend on **Vercel** / **Netlify** and Backend on **Render** / **Railway**), or deploy them together as a unified full-stack application.

---

## 📁 Project Architecture

```
├── backend/                  # Dedicated Backend API
│   ├── controllers/          # Business logic (auth, projects, tasks)
│   ├── models/               # Mongoose schemas (User, Project, Task)
│   ├── routes/               # Express REST routes (/api/...)
│   ├── middleware/           # JWT auth middleware
│   ├── db/                   # MongoDB connection + mock DB fallback
│   ├── utils/                # Email & helper utilities
│   ├── app.ts                # Express app setup with CORS
│   ├── server.ts             # Standalone backend server runner
│   ├── package.json          # Standalone backend dependencies
│   ├── tsconfig.json         # Standalone TypeScript configuration
│   ├── .env.example          # Backend environment variables
│   ├── Dockerfile            # Containerized backend build
│   └── README.md             # Backend deployment instructions
│
├── frontend/                 # Dedicated Frontend SPA
│   ├── src/                  # React 19 + Tailwind CSS application
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # Auth and Theme providers
│   │   ├── pages/            # Dashboard, Login, Register, Password Reset
│   │   └── utils/api.ts      # Preconfigured Axios/Fetch client with VITE_API_URL
│   ├── public/               # Static assets
│   ├── index.html            # Vite HTML entry point
│   ├── vite.config.ts        # Standalone Vite configuration
│   ├── package.json          # Standalone frontend dependencies
│   ├── tsconfig.json         # Standalone TypeScript configuration
│   ├── vercel.json           # Vercel SPA route rewrite rules
│   ├── netlify.toml          # Netlify SPA redirect rules
│   ├── .env.example          # Frontend environment variables
│   └── README.md             # Frontend deployment instructions
│
├── server.ts                 # Unified full-stack Express + Vite dev runner
├── package.json              # Monorepo scripts (dev, build, start)
└── vite.config.ts            # Root Vite builder pointing to /frontend
```

---

## Option 1: Separate Deployment (Recommended for Cloud Hosting)

### 1. Deploy the Backend (e.g. Render, Railway, Fly.io, Heroku)

1. Push your code to GitHub.
2. In **Render** (or Railway):
   - Choose **New Web Service**.
   - Select your repository.
   - Set **Root Directory** to `backend`.
   - Set **Build Command** to `npm install && npm run build`.
   - Set **Start Command** to `npm start`.
3. Set the following **Environment Variables**:
   - `PORT`: `5000` (or leave default assigned by provider)
   - `JWT_SECRET`: A strong secret key (e.g. `openssl rand -hex 32`)
   - `CLIENT_ORIGIN`: Your frontend URL once deployed (or `*` during initial testing)
   - `MONGODB_URI`: *(Optional)* Your MongoDB Atlas connection URI (leave empty to use the built-in mock database).
4. Deploy! Your backend will be accessible at `https://your-backend-api.onrender.com`.

---

### 2. Deploy the Frontend (e.g. Vercel, Netlify, Cloudflare Pages)

1. In **Vercel** (or Netlify):
   - Import your GitHub repository.
   - Set **Root Directory** to `frontend`.
   - Framework Preset: **Vite**.
   - Set **Build Command**: `npm run build`.
   - Set **Output Directory**: `dist`.
2. Add **Environment Variables**:
   - `VITE_API_URL`: Required for separate deployments; set it to the backend origin (for this deployment, `https://login-hkdx.onrender.com`).
   - Vercel's rewrite serves the SPA and does not proxy `/api` requests. Vite embeds this variable at build time, so redeploy after changing it.
3. Deploy!
   - Single-page application routing is already preconfigured via `frontend/vercel.json` and `frontend/netlify.toml`, so deep links like `/dashboard` work seamlessly without 404 errors.

---

## Option 2: Unified Monorepo Deployment (Docker or Single Server)

You can also run both frontend and backend on a single domain/port:

```bash
# Install all dependencies
npm install

# Build both frontend assets and backend server bundle
npm run build

# Start the production server
npm start
```
The compiled server serves the REST API from `/api` and serves the static frontend SPA from `/` on port 3000.

---

## Summary of Environment Variables

| Variable | Location | Description |
|---|---|---|
| `VITE_API_URL` | Frontend (`frontend/.env`) | Backend origin. Required for separate deployments; leave empty only when a same-origin API proxy is configured. |
| `CLIENT_ORIGIN` | Backend (`backend/.env`) | Allowed frontend origin(s) for CORS. Can be comma-separated or `*`. |
| `JWT_SECRET` | Backend (`backend/.env`) | Secret string for signing and verifying JSON Web Tokens. |
| `MONGODB_URI` | Backend (`backend/.env`) | Real MongoDB connection string. When unset, uses local JSON fallback. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Backend (`backend/.env`) | Gmail SMTP connection settings and App Password; use `smtp.gmail.com`, port `465`, and secure TLS for Gmail. Set exactly one complete credentials pair (`SMTP_*` or `EMAIL_*`). |
| `EMAIL_FROM` | Backend (`backend/.env`) | Optional sender address authorized by the configured mail account. |
| `APP_URL` | Backend (`backend/.env`) | Frontend origin used to generate password-reset links. |
