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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-google-app-password
EMAIL_FROM=your-gmail-address@gmail.com
APP_URL=https://your-frontend-domain.vercel.app
```

For Gmail, use a Google App Password for `SMTP_PASS`, not the account password. Spaces in the App Password are removed automatically. `EMAIL_FROM` is optional and should be an address authorized to send through the configured Gmail account. The backend accepts either `EMAIL_USER` / `EMAIL_PASS` or `SMTP_USER` / `SMTP_PASS`; configure one complete pair only. If both pairs are supplied, they must match, otherwise sending is disabled and a credential-safe configuration diagnostic is logged. Port 465 uses implicit TLS by default; port 587 is used only as a connection-failure fallback and requires STARTTLS.

In Render, add these variables to the backend Web Service's Environment settings. Do not include quotes around values. `APP_URL` must be the deployed frontend origin so password-reset links do not point to localhost. After changing environment variables, redeploy/restart the service. Successful SMTP submission means the SMTP server accepted the message; it does not guarantee inbox placement.

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
