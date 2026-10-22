# Workspace Dashboard Hub - Frontend

React 19 + Vite + Tailwind CSS single page web application for Workspace Dashboard Hub.

## Features
- **Modern UI**: Tailwind CSS v4, Lucide React icons, dark/light theme switching.
- **Client-Side Routing**: React Router v7 with protected routes.
- **REST Integration**: Preconfigured Axios & Fetch utilities that automatically connect to your backend via `VITE_API_URL` or relative proxying.
- **Zero-config SPA Redirects**: Pre-packaged `vercel.json` and `netlify.toml` for seamless client-side page reloads.

## Environment Variables
Create `.env` based on `.env.example`:
```env
# URL of your deployed backend (e.g., https://workspace-api.onrender.com)
# Leave empty during local monorepo development
VITE_API_URL=
```

## Running Standalone
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Build for production (outputs to dist/)
npm run build

# 4. Preview production build locally
npm run preview
```

## Deployment Options

### Vercel
1. Import your GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. In **Environment Variables**, add:
   - `VITE_API_URL`: Your backend URL (e.g. `https://workspace-api.onrender.com`).
5. Click **Deploy**. Vercel uses `vercel.json` to handle all routing seamlessly.

### Netlify
1. Connect your repository on Netlify.
2. Set **Base directory** to `frontend`.
3. Set **Build command** to `npm run build`.
4. Set **Publish directory** to `frontend/dist` (or `dist`).
5. Add `VITE_API_URL` in Site configuration > Environment variables.
6. Click **Deploy**. Netlify uses `netlify.toml` for single-page routing.

### Cloudflare Pages
1. Create a project in Cloudflare Pages.
2. Select your repository, set root directory to `frontend`.
3. Framework preset: **Vite**.
4. Build command: `npm run build`, output: `dist`.
5. Set `VITE_API_URL` and deploy.
