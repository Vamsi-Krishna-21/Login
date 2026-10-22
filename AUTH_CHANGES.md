# Authentication & Security Architecture - Changes and Specifications

## 1. Overview
The full-stack Workspace Dashboard Hub application provides a robust, enterprise-grade authentication and user account management flow. During this migration, the entire frontend was converted from TypeScript React (`.tsx` / `.ts`) to pure JavaScript React (`.jsx` / `.js`) without changing any business logic, API contracts, or UI interactions.

---

## 2. Frontend Conversion Summary

| Component / Module | Original TS File | Converted JS File | Key Changes Made |
|---|---|---|---|
| **API Client** | `src/utils/api.ts` | `src/utils/api.js` | Removed TypeScript type annotations (`: string`, `(import.meta as any)`). Maintained configurable `VITE_API_URL` and Axios interceptors for automatic `Bearer` token attachment. |
| **Auth Context** | `src/context/AuthContext.tsx` | `src/context/AuthContext.jsx` | Removed `AuthContextType` interface, `User` type imports, and generic type parameters `createContext<AuthContextType>`. Preserved `user`, `token`, `isLoading`, `login`, `logout`, `updateUser`, and `apiFetch`. |
| **Theme Context** | `src/context/ThemeContext.tsx` | `src/context/ThemeContext.jsx` | Removed `Theme` type alias (`"light" \| "dark"`) and `ThemeContextType` interface. Preserved system color scheme detection and theme state persistence in `localStorage`. |
| **Login Page** | `src/pages/Login.tsx` | `src/pages/Login.jsx` | Removed `React.FormEvent` and `err: any` type annotations. Retained email/username identifier authentication, password visibility toggling, error alerts, and redirect to dashboard. |
| **Register Page** | `src/pages/Register.tsx` | `src/pages/Register.jsx` | Removed event and error types. Preserved real-time password strength validation rules (8+ chars, uppercase, numeric, special character), password matching check, and success toast countdown. |
| **Dashboard Page** | `src/pages/Dashboard.tsx` | `src/pages/Dashboard.jsx` | Removed union generic states (`useState<"general" \| "email" \| "password">`, `useState<"request" \| "verify">`). Preserved full account management: general profile edits, two-step OTP email change, and two-step OTP password update. |
| **Forgot Password** | `src/pages/ForgotPassword.tsx` | `src/pages/ForgotPassword.jsx` | Removed TypeScript types. Preserved email submission for password reset link generation. |
| **Reset Password** | `src/pages/ResetPassword.tsx` | `src/pages/ResetPassword.jsx` | Removed TS types. Preserved token param extraction via `useParams()`, client-side password strength validation, and secure password reset API call. |
| **Navbar** | `src/components/Navbar.tsx` | `src/components/Navbar.jsx` | Removed `: string` type parameter on route matching helpers (`activeLink`, `activeMobileLink`). Preserved mobile drawer animation and user status badge. |
| **Footer** | `src/components/Footer.tsx` | `src/components/Footer.jsx` | Converted to pure JSX functional component. |
| **App Entry Point** | `src/App.tsx`, `src/main.tsx` | `src/App.jsx`, `src/main.jsx` | Updated module imports to reference `.jsx` extensions. Removed non-null assertion `document.getElementById('root')!`. |

---

## 3. Authentication Security Features

### A. Password Security Standards
Both frontend client validation and backend middleware enforce strict password complexity:
1. **Minimum Length**: At least 8 characters.
2. **Uppercase Letter**: At least one `[A-Z]` character.
3. **Numeric Digit**: At least one `[0-9]` character.
4. **Special Character**: At least one special symbol `[^A-Za-z0-9]`.
5. **Confirmation**: Passwords must match exactly before dispatching API requests.

### B. Password Hashing (Bcrypt)
Passwords are automatically hashed before persistence using `bcryptjs` with 10 salt rounds in the Mongoose schema pre-save hook (`backend/models/User.ts`):
```typescript
UserSchema.pre("save", async function() {
  if (this.password && !this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});
```

### C. JWT Session Handling
- Tokens are signed with `jsonwebtoken` using the backend `JWT_SECRET`.
- Valid for 7 days with claims containing `id`, `email`, and `username`.
- Stored on the client in `localStorage` under keys `token` and `workspace_token`.
- Verified on protected routes by `authMiddleware` via the HTTP `Authorization: Bearer <token>` header.
- Handled gracefully on 401/411 responses by clearing tokens and redirecting to the login view.

### D. OTP-Guarded Sensitive Updates
- **Email Updates**: Initiating an email change generates a 6-digit cryptographic OTP sent to the target email address with a 15-minute expiration time. Once verified, the user's primary email address is modified.
- **Password Updates**: Initiating an in-app password change sends a 6-digit OTP to the currently verified user email. The new password is only saved after successful OTP confirmation.

---

## 4. Backend Preservation
- The backend remains strictly in `backend/` as a TypeScript Express REST API with full typings and schemas.
- Dual-mode database compatibility:
  - When `MONGODB_URI` is provided: Connects to MongoDB Atlas / replica set.
  - When `MONGODB_URI` is empty/absent: Automatically falls back to a file-based mock JSON database in `data/db.json` with zero extra configuration.
- CORS dynamically respects `CLIENT_ORIGIN` or `FRONTEND_URL` for Vercel/Netlify deployments.
