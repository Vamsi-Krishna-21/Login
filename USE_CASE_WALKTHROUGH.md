# Use Case Walkthrough - Workspace Dashboard Hub

This document provides an end-to-end walkthrough of all user flows, UI views, authentication behaviors, and API interactions within the Workspace Dashboard Hub.

---

## Use Case 1: New User Registration

### Objective
Create a new user account with secure credentials and validated password criteria.

### Steps
1. Navigate to `http://localhost:5173/register` (or click **"Sign Up Free"** / **"Create Account"**).
2. Enter your information:
   - **Full Name**: e.g. `Alex Rivera`
   - **Username**: e.g. `alexrivera`
   - **Date of Birth** *(Optional)*: e.g. `1995-06-15`
   - **Email Address**: e.g. `alex@example.com`
   - **Password**: Enter a secure password.
3. Observe real-time password strength indicators:
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 number
   - At least 1 special character
4. Confirm password: Re-enter the identical password.
5. Click **"Create Account"**.
6. The system sends a `POST /api/auth/register` request.
7. Upon success, a confirmation message is displayed, and the user is redirected to the Login page after 1.5 seconds.

---

## Use Case 2: User Sign In & JWT Authentication

### Objective
Authenticate an existing account and obtain an access session token.

### Steps
1. Navigate to `http://localhost:5173/` (or click **"Sign In"**).
2. Enter your credentials:
   - **Email or Username**: Enter either your registered email address or username.
   - **Password**: Enter your password (use the eye icon toggle `👁️` / `🙈` to inspect if desired).
3. Click **"Sign In"**.
4. The frontend sends `POST /api/auth/login` with `{ identifier, password }`.
5. On success:
   - The returned JWT is saved to `localStorage` under keys `token` and `workspace_token`.
   - The user is redirected to `/dashboard`.
6. On error:
   - An alert banner displays the exact error reason (e.g. "Invalid email or password").

---

## Use Case 3: Workspace Dashboard & Session Persistence

### Objective
Access the authenticated workspace overview and verify protected route security.

### Steps
1. Upon loading `/dashboard`, the component checks for the JWT in `localStorage`.
   - If missing: redirects immediately to `/`.
2. The component calls `GET /api/dashboard` with the `Authorization: Bearer <token>` header.
3. The dashboard displays:
   - Greeting banner with user's full name.
   - Verified account status badge (`Account Active`).
   - Top navigation showing the user's name, email, theme toggle, settings button, and logout button.
4. Refreshing the browser preserves the active session seamlessly.

---

## Use Case 4: General Profile Update

### Objective
Modify general profile parameters without requiring two-factor confirmation.

### Steps
1. In the top navigation bar of the dashboard, click the **"Settings"** button.
2. In the modal, select the **"General Profile"** tab.
3. Edit:
   - **Full Name**
   - **Username**
   - **Date of Birth**
4. Click **"Save Changes"**.
5. The frontend issues `PUT /api/auth/profile` with the updated attributes.
6. A success message confirms the update, and the new name/username is reflected immediately across the UI.

---

## Use Case 5: Verified Email Change (Two-Step OTP Flow)

### Objective
Change account email safely using a one-time verification code.

### Steps
1. Open the **"Settings"** modal and select the **"Email Update"** tab.
2. Enter the new desired email address (e.g. `newemail@example.com`).
3. Click **"Request Email Change"**.
4. The backend sends `POST /api/auth/request-email-change`. A 6-digit OTP is generated and emailed to the new address.
5. The modal displays a 6-digit numeric input field.
6. Enter the 6-digit verification code.
7. Click **"Verify & Update Email"**.
8. The backend verifies the OTP via `POST /api/auth/verify-email-change` and updates the user record.
9. A confirmation alert displays: `"Email updated successfully to newemail@example.com"`.

---

## Use Case 6: In-App Password Change (Two-Step OTP Flow)

### Objective
Change account password while logged in, authenticated via email OTP verification.

### Steps
1. Open the **"Settings"** modal and select the **"Security & Pass"** tab.
2. Enter the new password and verify all complexity requirements are met.
3. Click **"Request Password Change"**.
4. The backend generates a 6-digit OTP and sends it to the current registered email address via `POST /api/auth/request-password-change`.
5. Enter the 6-digit OTP in the verification step.
6. Click **"Verify & Update Password"**.
7. The backend confirms the OTP and securely re-hashes the new password via `POST /api/auth/verify-password-change`.
8. The password update is confirmed.

---

## Use Case 7: Forgot Password & Reset Password Flow

### Objective
Recover account access when the password has been forgotten.

### Steps
1. On the Login page, click **"Forgot password?"** (or navigate to `/forgot-password`).
2. Enter your registered email address and click **"Send Reset Link"**.
3. The backend issues a time-limited reset token and sends an email via `POST /api/auth/forgot-password`.
4. Open the link provided in the email: `/reset-password/<token>`.
5. Enter a new password complying with all complexity requirements.
6. Re-enter the new password in **Confirm New Password**.
7. Click **"Reset Password"**.
8. The backend verifies the token and updates the password via `POST /api/auth/reset-password/:token`.
9. The user is redirected back to `/` to sign in with their new credentials.

---

## Use Case 8: Theme Switching & Responsive Navigation

### Objective
Toggle between Dark and Light mode themes, and interact with the responsive mobile drawer.

### Steps
1. Click the Sun/Moon icon button in the navbar.
2. The UI instantly toggles between light and dark themes, adding or removing the `dark` class on the `<html>` root.
3. The preference is stored in `localStorage` (`workspace_theme`) and respected on subsequent reloads.
4. On smaller screen widths (<768px), navigation collapses into an animated mobile hamburger menu.

---

## Use Case 9: Logout

### Objective
Terminate the current session and clean up stored tokens.

### Steps
1. Click the **"Logout"** button in the dashboard navbar.
2. `AuthContext.logout()` removes `token` and `workspace_token` from `localStorage`.
3. The browser is redirected back to the login screen (`/`).
