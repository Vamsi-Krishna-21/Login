# Workspace Dashboard Hub

A full-stack Login and Workspace Dashboard application featuring modern React 19, Tailwind CSS, JWT authentication, bcrypt password hashing, and user account management.

The frontend is converted from TypeScript React to clean, functional JavaScript React (`.jsx` and `.js`), while the backend retains its robust TypeScript Express architecture and zero-setup mock database fallback.

---

## 📁 Project Structure

```text
Login/
├── backend/
│   ├── controllers/              # Express route controllers (auth, projects, tasks)
│   ├── db/                       # Hybrid database client (MongoDB + Mock fallback)
│   ├── middleware/               # Authentication & JWT verification middleware
│   ├── models/                   # Mongoose schemas (User, Project, Task)
│   ├── routes/                   # Express API routes (/api/auth, /api/dashboard, etc.)
│   ├── utils/                    # Email and OTP utility functions
│   ├── app.ts                    # Express application configuration and CORS
│   ├── server.ts                 # Backend server entry point
│   ├── package.json              # Backend dependencies and scripts
│   ├── tsconfig.json             # Backend TypeScript configuration
│   ├── Dockerfile                # Backend containerization Dockerfile
│   ├── .env.example              # Backend environment variables template
│   └── README.md                 # Backend documentation
├── frontend/
│   ├── public/                   # Static assets (images, icons)
│   ├── src/
│   │   ├── components/           # Reusable UI components (Navbar.jsx, Footer.jsx)
│   │   ├── context/              # React Context providers (AuthContext.jsx, ThemeContext.jsx)
│   │   ├── pages/                # App pages (Dashboard.jsx, Login.jsx, Register.jsx, etc.)
│   │   ├── utils/                # Utility modules (api.js with Axios interceptors)
│   │   ├── App.jsx               # Application routing and layout provider
│   │   ├── index.css             # Tailwind CSS v4 styling rules
│   │   └── main.jsx              # React DOM entry point
│   ├── index.html                # Vite HTML root template
│   ├── jsconfig.json             # Path alias configuration (@/*)
│   ├── netlify.toml              # Netlify SPA redirect rules
│   ├── package.json              # Frontend dependencies and scripts
│   ├── vercel.json               # Vercel SPA rewrite rules
│   ├── vite.config.js            # Vite build and plugin configuration
│   ├── .env.example              # Frontend environment variables template
│   └── README.md                 # Frontend documentation
├── .gitignore                    # Git ignore configuration
├── AUTH_CHANGES.md               # Detailed authentication and security specifications
├── README.md                     # Main project guide (this file)
└── USE_CASE_WALKTHROUGH.md       # Step-by-step user flow walkthroughs
```

---

## ⚡ Quick Start: Running Locally

### 1. Start the Backend API

Open a terminal and navigate to the backend directory:

```bash
cd backend
npm install
npm run dev
```

The backend server starts on `http://localhost:5000` (or the port specified in `PORT`).
- Health check available at: `http://localhost:5000/api/health`
- Database: Automatically falls back to the local JSON database (`data/db.json`) if `MONGODB_URI` is not set.

### 2. Start the Frontend (JavaScript React)

Open a separate terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server starts on `http://localhost:5173`.
Visit `http://localhost:5173` in your browser.

---

## 🚀 Building for Production

### Frontend
```bash
cd frontend
npm run build
```
Production assets are generated in `frontend/dist/`.

### Backend
```bash
cd backend
npm run build
npm start
```
Compiles TypeScript into `backend/dist/server.js` using esbuild and runs with Node.

---

## 🌐 Deploying Frontend to Vercel

The frontend is fully configured for standalone deployment to **Vercel**:

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), click **"Add New Project"** and select your repository.
3. Configure the project settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   - `VITE_API_URL`: The URL of your deployed backend (e.g. `https://your-backend-api.onrender.com`).
5. Click **"Deploy"**.

Routing redirects are handled automatically via `frontend/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 🔑 Environment Variables Reference

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API. When empty, requests are relative (useful with proxies). | `http://localhost:5000` or empty |

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `PORT` | Port for the backend Express server | `5000` |
| `JWT_SECRET` | Secret string for signing JWT tokens | `super-secret-workspace-key-1357` |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `*` (or frontend domain) |
| `MONGODB_URI` | MongoDB connection string (falls back to mock DB if unset) | *(empty)* |
| `SMTP_*` | Optional SMTP mail server configuration | *(empty, uses console mock)* |

---

## 🧪 Default Test Credentials

When running with the built-in mock database, you can log in immediately or register a new user:
- **Email**: `demo@workspace.com`
- **Password**: `demopassword123`
"# Login" 
