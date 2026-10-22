import "./config/env.js";
import { validateProductionConfig } from "./config/env.js";
import { app, connectAndSeed } from "./app.js";
import { verifyEmailTransporter } from "./utils/email.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

async function startBackendServer() {
  // Validate production requirements (JWT_SECRET, MONGODB_URI)
  validateProductionConfig();

  // Connect to database
  await connectAndSeed();

  // Non-blocking check of email transporter on startup
  verifyEmailTransporter().catch((err: any) => {
    console.warn("[SMTP STARTUP] Initial transporter verification warning:", err.message);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend API server successfully running on http://0.0.0.0:${PORT}`);
    console.log(`Health check available at http://0.0.0.0:${PORT}/api/health`);
  });
}

startBackendServer().catch((err) => {
  console.error("Critical error starting backend server:", err);
  process.exit(1);
});
