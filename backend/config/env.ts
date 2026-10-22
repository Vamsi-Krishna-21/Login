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
  apiKey: string;
  from: string;
  isConfigured: boolean;
  configurationIssue:
    | "missing-api-key"
    | "missing-sender"
    | "missing-api-key-and-sender"
    | null;
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
 * Resolves the Resend API key and verified sender configuration.
 */
export function getEmailConfig(): EmailConfig {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const from = (process.env.EMAIL_FROM || "").trim();
  const configurationIssue = !apiKey && !from
    ? "missing-api-key-and-sender"
    : !apiKey
      ? "missing-api-key"
      : !from
        ? "missing-sender"
        : null;
  const isConfigured = configurationIssue === null;

  return {
    apiKey,
    from,
    isConfigured,
    configurationIssue,
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

    // 3. Check transactional email configuration in production
    const emailConfig = getEmailConfig();
    if (!emailConfig.isConfigured) {
      console.warn(
        `WARNING: Resend email configuration is incomplete (${emailConfig.configurationIssue}). Set RESEND_API_KEY and EMAIL_FROM in production.`
      );
    }
  }
}
