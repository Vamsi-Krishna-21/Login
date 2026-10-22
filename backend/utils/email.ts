import { Resend } from "resend";
import { getEmailConfig } from "../config/env.js";

let cachedResend: Resend | null = null;
let cachedApiKey: string | null = null;

type EmailOperation = "email-change" | "password-change" | "password-reset";

function getResendErrorDetails(error: unknown): {
  statusCode?: number;
  category: string;
  requestId?: string;
} {
  const resendError = error && typeof error === "object"
    ? error as {
        statusCode?: unknown;
        name?: unknown;
        headers?: unknown;
      }
    : {};
  const statusCode = typeof resendError.statusCode === "number" &&
    Number.isInteger(resendError.statusCode)
    ? resendError.statusCode
    : undefined;
  const errorName = typeof resendError.name === "string" &&
    /^[a-z0-9_-]{1,60}$/i.test(resendError.name)
    ? resendError.name
    : undefined;
  const headers = resendError.headers && typeof resendError.headers === "object"
    ? resendError.headers as Record<string, unknown>
    : null;
  const requestIdValue = headers?.["x-request-id"] ??
    headers?.["request-id"] ??
    headers?.["x-resend-id"];
  const requestId = typeof requestIdValue === "string" &&
    /^[a-z0-9._:-]{1,128}$/i.test(requestIdValue)
    ? requestIdValue
    : undefined;
  const category = statusCode === 401 || statusCode === 403
    ? "authentication_or_authorization_failure"
    : statusCode === 429
      ? "rate_limited"
      : statusCode !== undefined && statusCode >= 500
        ? "provider_server_error"
        : statusCode !== undefined
          ? "provider_rejected_request"
          : errorName === "validation_error"
            ? "provider_validation_failure"
            : errorName
              ? "network_or_sdk_error"
              : "unknown_failure";

  return {
    ...(statusCode !== undefined ? { statusCode } : {}),
    category,
    ...(requestId ? { requestId } : {}),
  };
}

function logResendFailure(operation: EmailOperation, error: unknown): void {
  console.error(JSON.stringify({
    event: "email.resend.failure",
    operation,
    ...getResendErrorDetails(error),
  }));
}

/**
 * Returns a reusable Resend client.
 */
export function getTransporter(): Resend | null {
  const config = getEmailConfig();
  if (!config.apiKey) {
    cachedResend = null;
    cachedApiKey = null;
    return null;
  }

  if (!cachedResend || cachedApiKey !== config.apiKey) {
    cachedResend = new Resend(config.apiKey);
    cachedApiKey = config.apiKey;
  }

  return cachedResend;
}

/**
 * Checks local Resend configuration; it does not make a network request.
 */
export async function verifyEmailTransporter(): Promise<{ verified: boolean; message: string }> {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    console.error(JSON.stringify({
      event: "email.resend.configuration_failure",
      category: config.configurationIssue,
    }));
    return {
      verified: false,
      message: "Resend requires RESEND_API_KEY and EMAIL_FROM to be configured.",
    };
  }

  getTransporter();
  console.log(JSON.stringify({ event: "email.resend.configuration_ready" }));
  return { verified: true, message: "Resend email configuration is present." };
}

/**
 * Submits an email through Resend and reports success only when the API accepts it.
 */
async function deliverEmail(
  operation: EmailOperation,
  mailOptions: { to: string; subject: string; html: string }
): Promise<boolean> {
  const config = getEmailConfig();
  if (!config.isConfigured) {
    console.error(JSON.stringify({
      event: "email.resend.configuration_failure",
      operation,
      category: config.configurationIssue,
    }));
    return false;
  }

  const resend = getTransporter();
  if (!resend) {
    return false;
  }

  try {
    const { data, error, headers } = await resend.emails.send({
      from: config.from,
      ...mailOptions,
    });
    if (error || !data) {
      logResendFailure(operation, {
        ...(error || {}),
        headers,
      });
      return false;
    }

    const requestId = headers?.["x-request-id"] ??
      headers?.["request-id"] ??
      headers?.["x-resend-id"];
    console.log(JSON.stringify({
      event: "email.resend.accepted",
      operation,
      ...(typeof requestId === "string" &&
        /^[a-z0-9._:-]{1,128}$/i.test(requestId)
        ? { requestId }
        : {}),
    }));
    return true;
  } catch (error) {
    logResendFailure(operation, error);
    return false;
  }
}

function generateOtpHtml(subject: string, description: string, otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 580px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.05);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          padding: 40px 32px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .content {
          padding: 40px 32px;
          color: #334155;
          line-height: 1.6;
        }
        .content p {
          margin-top: 0;
          margin-bottom: 24px;
          font-size: 15px;
        }
        .otp-container {
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin: 32px 0;
        }
        .otp-code {
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: #1e1b4b;
          margin: 0;
        }
        .otp-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-top: 8px;
          font-weight: 600;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px 32px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #94a3b8;
        }
        .footer p {
          margin: 0 0 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Workspace Dashboard Hub</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>${description}</p>
          
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-label">Verification Code (Expires in 15 minutes)</div>
          </div>
          
          <p>If you did not make this request, you can safely ignore this email. Your account remains completely secure.</p>
          <p>Best regards,<br>The Workspace Team</p>
        </div>
        <div class="footer">
          <p>Sent with 💜 by Workspace Dashboard Hub.</p>
          <p>This is an automated security message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateResetPasswordHtml(subject: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 580px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.05);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          padding: 40px 32px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .content {
          padding: 40px 32px;
          color: #334155;
          line-height: 1.6;
        }
        .content p {
          margin-top: 0;
          margin-bottom: 24px;
          font-size: 15px;
        }
        .btn-container {
          text-align: center;
          margin: 32px 0;
        }
        .btn-reset {
          display: inline-block;
          background-color: #4f46e5;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 32px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1);
        }
        .btn-reset:hover {
          background-color: #4338ca;
        }
        .fallback-text {
          font-size: 13px;
          color: #64748b;
          word-break: break-all;
          margin-top: 24px;
          padding: 16px;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px dashed #cbd5e1;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px 32px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #94a3b8;
        }
        .footer p {
          margin: 0 0 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Workspace Dashboard Hub</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your account. Click the button below to set a new password. This link is valid for 1 hour:</p>
          
          <div class="btn-container">
            <a href="${resetLink}" class="btn-reset" target="_blank">Reset Password</a>
          </div>
          
          <p>If the button doesn't work, copy and paste the following link into your web browser:</p>
          <div class="fallback-text">
            <a href="${resetLink}">${resetLink}</a>
          </div>
          
          <p>If you did not request a password reset, you can safely ignore this email. No changes will be made to your account.</p>
          <p>Best regards,<br>The Workspace Team</p>
        </div>
        <div class="footer">
          <p>Sent with 💜 by Workspace Dashboard Hub.</p>
          <p>This is an automated security message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends a 6-digit OTP email for email change or password change.
 */
export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  type: "email-change" | "password-change"
): Promise<boolean> {
  const subject =
    type === "email-change"
      ? "📧 Verify Your New Email Address - Workspace Dashboard Hub"
      : "🔒 Password Change Verification Code - Workspace Dashboard Hub";

  const description =
    type === "email-change"
      ? "We received a request to update the email address associated with your Workspace account. Please use the verification code below to confirm this change:"
      : "We received a request to change your password. For your security, please use the verification code below to verify your identity and complete the process:";

  const htmlContent = generateOtpHtml(subject, description, otp);

  return deliverEmail(type, {
    to: toEmail,
    subject,
    html: htmlContent,
  });
}

/**
 * Sends a password reset link email.
 */
export async function sendResetPasswordEmail(
  toEmail: string,
  resetLink: string
): Promise<boolean> {
  const subject = "🔑 Reset Your Password - Workspace Dashboard Hub";
  const htmlContent = generateResetPasswordHtml(subject, resetLink);

  return deliverEmail("password-reset", {
    to: toEmail,
    subject,
    html: htmlContent,
  });
}
