# Workspace Dashboard Hub - Backend API

Express + TypeScript REST API providing JWT authentication, user profile management, projects, and task management.

## Features
- **Authentication**: JWT token verification, registration, login, secure password hashing with bcrypt.
- **Project & Task API**: Full CRUD, pagination, filtering, search, and priority handling.
- **Database**: Works out of the box with zero setup using the included mock JSON database, or connect your real MongoDB Atlas cluster via `MONGODB_URI`.
- **CORS Configured**: Ready to accept cross-origin requests from separate frontend deployments (e.g. Vercel, Netlify).

## Environment Variables
Create a `.env` file based on `.env.example`:
```env
PORT=5000
JWT_SECRET=your-secure-jwt-secret
CLIENT_ORIGIN=https://your-frontend-domain.vercel.app
MONGODB_URI=mongodb+srv://... (optional, fallback to mock DB)
RESEND_API_KEY=re_...
EMAIL_FROM=Workspace Dashboard Hub <no-reply@your-verified-domain.com>
APP_URL=https://your-frontend-domain.vercel.app
```

`RESEND_API_KEY` and `EMAIL_FROM` are both required for email delivery. Verify the sender domain in Resend and use an address on that verified domain; a Gmail address is not automatically an authorized sender. Resend sends over HTTPS through its API. SMTP variables are no longer used by this backend.

In Render, add these variables to the backend Web Service's Environment settings. Do not include quotes around values. `APP_URL` must be the deployed frontend origin so password-reset links do not point to localhost. After changing environment variables, redeploy/restart the service. A successful Resend API response means the provider accepted the request; it does not guarantee inbox placement.

## Running Standalone
```bash
# 1. Install dependencies
npm install

# 2. Run in development mode
npm run dev

# 3. Build for production
npm run build

# 4. Start production server
npm start
```

## Deployment Options

### Render.com (Web Service)
1. Link your GitHub repository.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to `npm install && npm run build`.
4. Set **Start Command** to `npm start`.
5. In Environment Variables, set `JWT_SECRET` and `CLIENT_ORIGIN` (your frontend domain).

### Railway.app
1. Create a new service from your repo.
2. In Settings, set **Root Directory** to `/backend`.
3. Railway automatically detects Node.js and uses `npm run build` and `npm start`.

### Docker
```bash
docker build -t workspace-backend .
docker run -p 5000:5000 -e JWT_SECRET=secret workspace-backend
```
