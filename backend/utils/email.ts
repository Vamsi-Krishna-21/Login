import nodemailer from "nodemailer";
import { getEmailConfig } from "../config/env.js";

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedTransporterConfig: {
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
} | null = null;

type SmtpFailureCategory =
  | "authentication_failure"
  | "connection_failure"
  | "tls_failure"
  | "server_rejection"
  | "other";

function getSmtpErrorDetails(error: unknown): {
  category: SmtpFailureCategory;
  code?: string;
  responseCode?: number;
  command?: string;
  message: string;
} {
  const smtpError = error && typeof error === "object"
    ? error as {
        code?: unknown;
        responseCode?: unknown;
        command?: unknown;
        message?: unknown;
      }
    : {};
  const code = typeof smtpError.code === "string" && /^[A-Z0-9_-]{1,40}$/i.test(smtpError.code)
    ? smtpError.code
    : undefined;
  const responseCode = typeof smtpError.responseCode === "number" &&
    Number.isInteger(smtpError.responseCode)
    ? smtpError.responseCode
    : undefined;
  const command = typeof smtpError.command === "string" &&
    /^[A-Z ]{1,30}$/i.test(smtpError.command)
    ? smtpError.command.toUpperCase()
    : undefined;
  const errorMessage = typeof smtpError.message === "string" ? smtpError.message : "";

  if (responseCode === 535 || responseCode === 534 || code === "EAUTH") {
    return {
      category: "authentication_failure",
      code,
      responseCode,
      command,
      message: "SMTP authentication was rejected.",
    };
  }
  if (
    /tls|ssl|certificate|handshake|self[- ]signed/i.test(errorMessage) ||
    code === "ERR_TLS_CERT_ALTNAME_INVALID" ||
    code === "ETLS"
  ) {
    return {
      category: "tls_failure",
      code,
      responseCode,
      command,
      message: "SMTP TLS negotiation or certificate validation failed.",
    };
  }
  if (
    ["ECONNECTION", "ECONNREFUSED", "ETIMEDOUT", "ESOCKET", "EHOSTUNREACH", "ENETUNREACH"]
      .includes(code || "")
  ) {
    return {
      category: "connection_failure",
      code,
      responseCode,
      command,
      message: "Could not establish or maintain the SMTP connection.",
    };
  }
  if (responseCode !== undefined && responseCode >= 400) {
    return {
      category: "server_rejection",
      code,
      responseCode,
      command,
      message: "The SMTP server rejected the message or command.",
    };
  }

  return {
    category: "other",
    code,
    responseCode,
    command,
    message: "The SMTP operation failed.",
  };
}

function logSmtpFailure(operation: "verify" | "send", port: number, error: unknown): void {
  const details = getSmtpErrorDetails(error);
  console.error(JSON.stringify({
    event: "email.smtp.failure",
    operation,
    category: details.category,
    port,
    ...(details.code ? { code: details.code } : {}),
    ...(details.responseCode ? { responseCode: details.responseCode } : {}),
    ...(details.command ? { command: details.command } : {}),
    message: details.message,
  }));
}

function createTransporter(
  config: ReturnType<typeof getEmailConfig>,
  port = config.port
): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port,
    secure: port === config.port ? config.secure : port === 465,
    ...(port === 587 ? { requireTLS: true } : {}),
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

function hasSameTransporterConfig(config: ReturnType<typeof getEmailConfig>): boolean {
  return Boolean(
    cachedTransporterConfig &&
    cachedTransporterConfig.user === config.user &&
    cachedTransporterConfig.pass === config.pass &&
    cachedTransporterConfig.host === config.host &&
    cachedTransporterConfig.port === config.port &&
    cachedTransporterConfig.secure === config.secure
  );
}

/**
 * Returns a reusable Nodemailer transporter instance.
 */
export function getTransporter(): nodemailer.Transporter | null {
  const config = getEmailConfig();
  if (!config.isConfigured) {
    cachedTransporter = null;
    cachedTransporterConfig = null;
    return null;
  }

  if (!cachedTransporter || !hasSameTransporterConfig(config)) {
    try {
      cachedTransporter = createTransporter(config);
      cachedTransporterConfig = {
        user: config.user,
        pass: config.pass,
        host: config.host,
        port: config.port,
        secure: config.secure,
      };
    } catch (error) {
      logSmtpFailure("verify", config.port, error);
      return null;
    }
  }

  return cachedTransporter;
}

/**
 * Verifies SMTP connection and authentication.
 */
export async function verifyEmailTransporter(): Promise<{ verified: boolean; message: string }> {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    const category = config.configurationIssue === "conflicting-credentials"
      ? "conflicting_credentials"
      : "missing_configuration";
    console.error(JSON.stringify({ event: "email.smtp.configuration_failure", category }));
    return {
      verified: false,
      message: "Email service credentials are missing, incomplete, or conflicting.",
    };
  }

  const primaryTransporter = getTransporter();
  if (!primaryTransporter) {
    return { verified: false, message: "SMTP transporter could not be created." };
  }

  try {
    await primaryTransporter.verify();
    console.log(JSON.stringify({
      event: "email.smtp.verified",
      port: config.port,
    }));
    return { verified: true, message: "SMTP configuration verified successfully." };
  } catch (error) {
    logSmtpFailure("verify", config.port, error);
    if (config.port === 465 && getSmtpErrorDetails(error).category === "connection_failure") {
      try {
        const fallbackTransporter = createTransporter(config, 587);
        await fallbackTransporter.verify();
        console.log(JSON.stringify({ event: "email.smtp.verified", port: 587 }));
        return {
          verified: true,
          message: "SMTP configuration verified using port 587.",
        };
      } catch (retryError) {
        logSmtpFailure("verify", 587, retryError);
      }
    }

    return { verified: false, message: "SMTP verification failed. See server diagnostics." };
  }
}

/**
 * Delivers an email message with port 587 fallback for connection failures on port 465.
 */
async function deliverEmail(mailOptions: nodemailer.SendMailOptions): Promise<boolean> {
  const config = getEmailConfig();
  const primaryTransporter = getTransporter();

  if (!config.isConfigured) {
    console.error(JSON.stringify({
      event: "email.smtp.configuration_failure",
      category: config.configurationIssue === "conflicting-credentials"
        ? "conflicting_credentials"
        : "missing_configuration",
    }));
    return false;
  }
  if (!primaryTransporter) {
    return false;
  }

  try {
    await primaryTransporter.sendMail(mailOptions);
    console.log(JSON.stringify({
      event: "email.smtp.submission_accepted",
      port: config.port,
    }));
    return true;
  } catch (error) {
    logSmtpFailure("send", config.port, error);

    if (config.port === 465 && getSmtpErrorDetails(error).category === "connection_failure") {
      try {
        const fallbackTransporter = createTransporter(config, 587);
        await fallbackTransporter.sendMail(mailOptions);
        console.log(JSON.stringify({
          event: "email.smtp.submission_accepted",
          port: 587,
        }));
        return true;
      } catch (retryError) {
        logSmtpFailure("send", 587, retryError);
      }
    }

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
  const config = getEmailConfig();

  const subject =
    type === "email-change"
      ? "📧 Verify Your New Email Address - Workspace Dashboard Hub"
      : "🔒 Password Change Verification Code - Workspace Dashboard Hub";

  const description =
    type === "email-change"
      ? "We received a request to update the email address associated with your Workspace account. Please use the verification code below to confirm this change:"
      : "We received a request to change your password. For your security, please use the verification code below to verify your identity and complete the process:";

  const htmlContent = generateOtpHtml(subject, description, otp);

  const fromAddress = config.from.includes("<")
    ? config.from
    : `"Workspace Security" <${config.from}>`;

  const sent = await deliverEmail({
    from: fromAddress,
    to: toEmail,
    subject,
    html: htmlContent,
  });

  if (sent) {
    return true;
  }

  return false;
}

/**
 * Sends a password reset link email.
 */
export async function sendResetPasswordEmail(
  toEmail: string,
  resetLink: string
): Promise<boolean> {
  const config = getEmailConfig();
  const subject = "🔑 Reset Your Password - Workspace Dashboard Hub";
  const htmlContent = generateResetPasswordHtml(subject, resetLink);

  const fromAddress = config.from.includes("<")
    ? config.from
    : `"Workspace Security" <${config.from}>`;

  const sent = await deliverEmail({
    from: fromAddress,
    to: toEmail,
    subject,
    html: htmlContent,
  });

  if (sent) {
    return true;
  }

  return false;
}
