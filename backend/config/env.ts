import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search and load .env from the most probable locations:
// 1. Current working directory .env
// 2. backend/.env
// 3. Parent project root .env
const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(process.cwd(), "..", ".env"),
  path.resolve(__dirname, "..", ".env"),
  path.resolve(__dirname, "../..", ".env"),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// Fallback default dotenv execution if no explicit candidate matched
dotenv.config();

export interface EmailConfig {
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  service: string;
  isConfigured: boolean;
  allowConsoleOtp: boolean;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Standardizes the database connection string.
 * Primary: MONGODB_URI
 * Fallback: MONGO_URI
 */
export function getMongoUri(): string | undefined {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri || uri.trim() === "") {
    return undefined;
  }
  return uri.trim();
}

/**
 * Validates and retrieves the JWT secret.
 * Enforces strict presence and strength in production.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (isProduction()) {
    if (!secret) {
      throw new Error(
        "FATAL CONFIG ERROR: JWT_SECRET environment variable is missing in production. Refusing to start server."
      );
    }
    if (secret.length < 32) {
      throw new Error(
        "FATAL CONFIG ERROR: JWT_SECRET must be at least 32 characters long in production for cryptographic safety."
      );
    }
    return secret;
  }

  // Development fallback
  if (!secret) {
    return "dev-local-only-jwt-secret-key-32-chars-long-xyz-987";
  }
  return secret;
}

/**
 * Resolves email configuration parameters supporting both EMAIL_* and SMTP_* naming.
 */
export function getEmailConfig(): EmailConfig {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").trim();
  const service = (process.env.EMAIL_SERVICE || "gmail").trim();
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;

  // Gmail App Passwords are 16 chars, frequently generated with spaces (e.g. "abcd efgh ijkl mnop")
  // Strip spaces for Gmail connections so authentication does not fail.
  const isGmail = host.toLowerCase().includes("gmail") || service.toLowerCase() === "gmail";
  const pass = isGmail ? rawPass.replace(/\s+/g, "") : rawPass;

  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1"
    : port === 465;

  const from = (process.env.EMAIL_FROM || user).trim();
  const isConfigured = Boolean(user && pass);

  // In production, console OTP logging is strictly disallowed.
  // In development, it must be explicitly enabled via ENABLE_CONSOLE_OTP or ALLOW_CONSOLE_OTP.
  const allowConsoleOtp = !isProduction() && (
    process.env.ENABLE_CONSOLE_OTP === "true" ||
    process.env.ALLOW_CONSOLE_OTP === "true"
  );

  return {
    user,
    pass,
    host,
    port,
    secure,
    from,
    service,
    isConfigured,
    allowConsoleOtp,
  };
}

/**
 * Validates production environment parameters on startup.
 */
export function validateProductionConfig(): void {
  if (isProduction()) {
    // 1. Validate JWT Secret
    getJwtSecret();

    // 2. Validate MongoDB URI
    const mongoUri = getMongoUri();
    if (!mongoUri) {
      throw new Error(
        "FATAL CONFIG ERROR: MONGODB_URI environment variable is required in production. Mock database storage is strictly prohibited in production."
      );
    }

    // 3. Check Email Configuration in production
    const emailConfig = getEmailConfig();
    if (!emailConfig.isConfigured) {
      console.warn(
        "WARNING: Email SMTP credentials (EMAIL_USER / EMAIL_PASS or SMTP_USER / SMTP_PASS) are not configured in production. Password reset and verification emails will fail."
      );
    }
  }
}
