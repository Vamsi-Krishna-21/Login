import nodemailer from "nodemailer";
import { getEmailConfig, isProduction } from "../config/env.js";

let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Returns a reusable Nodemailer transporter instance.
 */
export function getTransporter(): nodemailer.Transporter | null {
  const config = getEmailConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!cachedTransporter) {
    try {
      cachedTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure, // true for 465 (SSL/TLS)
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: isProduction(),
        },
      });
    } catch (error: any) {
      console.error("Failed to initialize Nodemailer transporter:", error.message);
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
    const msg = "Email service is not configured (EMAIL_USER / EMAIL_PASS or SMTP_USER / SMTP_PASS missing).";
    console.log(`[SMTP NOTICE] ${msg}`);
    return { verified: false, message: msg };
  }

  const primaryTransporter = getTransporter();
  if (!primaryTransporter) {
    return { verified: false, message: "Transporter could not be created from current configuration." };
  }

  try {
    await primaryTransporter.verify();
    console.log(`[SMTP SUCCESS] Verified connection to ${config.host}:${config.port} as ${config.user}`);
    return { verified: true, message: "SMTP configuration verified successfully." };
  } catch (error: any) {
    // If port 465 encounters connection drop/timeout (common with residential ISPs), test port 587 STARTTLS
    if (
      config.port === 465 &&
      (error.message?.includes("Connection closed") ||
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT")
    ) {
      try {
        console.log("[SMTP NOTICE] Port 465 connection dropped by network/ISP. Testing port 587 (STARTTLS)...");
        const fallbackTransporter = nodemailer.createTransport({
          host: config.host,
          port: 587,
          secure: false,
          auth: {
            user: config.user,
            pass: config.pass,
          },
          tls: {
            rejectUnauthorized: isProduction(),
          },
        });
        await fallbackTransporter.verify();
        console.log(`[SMTP SUCCESS] Verified connection on port 587 as ${config.user}`);
        return {
          verified: true,
          message: "SMTP verified via port 587 (port 465 dropped by network/ISP).",
        };
      } catch (retryErr: any) {
        // proceed with original error handling
      }
    }

    let friendly = error.message || "Unknown SMTP error";
    if (
      error.responseCode === 535 ||
      error.message?.includes("BadCredentials") ||
      error.message?.includes("Invalid second-factor")
    ) {
      friendly =
        "Gmail SMTP Authentication Failed (535): Invalid App Password. Ensure you use a 16-character Google App Password (not your normal Gmail account password) with 2-Step Verification enabled.";
    } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      friendly = `SMTP Connection Failed (${error.code}) to ${config.host}:${config.port}. Check network or firewall access.`;
    }

    console.error(`[SMTP ERROR] Verification failed: ${friendly}`);
    return { verified: false, message: friendly };
  }
}

/**
 * Delivers an email message with intelligent port fallback if local ISP drops port 465.
 */
async function deliverEmail(mailOptions: nodemailer.SendMailOptions): Promise<boolean> {
  const config = getEmailConfig();
  const primaryTransporter = getTransporter();

  if (!primaryTransporter || !config.isConfigured) {
    return false;
  }

  try {
    await primaryTransporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] Email delivered successfully to ${mailOptions.to}`);
    return true;
  } catch (error: any) {
    console.error(`[SMTP ERROR] Delivery attempt on port ${config.port} failed: ${error.message}`);

    // If port 465 is blocked or dropped by local ISP, retry once via port 587 (STARTTLS)
    if (
      config.port === 465 &&
      (error.message?.includes("Connection closed") ||
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT")
    ) {
      try {
        console.log("[SMTP RETRY] Retrying delivery via port 587 (STARTTLS)...");
        const fallbackTransporter = nodemailer.createTransport({
          host: config.host,
          port: 587,
          secure: false,
          auth: {
            user: config.user,
            pass: config.pass,
          },
          tls: {
            rejectUnauthorized: isProduction(),
          },
        });
        await fallbackTransporter.sendMail(mailOptions);
        console.log(`[SMTP SUCCESS] Fallback delivery on port 587 succeeded to ${mailOptions.to}`);
        return true;
      } catch (retryError: any) {
        console.error(`[SMTP ERROR] Fallback attempt on port 587 also failed: ${retryError.message}`);
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
    : `"Workspace Security" <${config.user}>`;

  const sent = await deliverEmail({
    from: fromAddress,
    to: toEmail,
    subject,
    html: htmlContent,
  });

  if (sent) {
    return true;
  }

  // Explicit development console logging only when allowed
  if (config.allowConsoleOtp) {
    console.log(`\n==================================================`);
    console.log(`[LOCAL DEV CONSOLE OTP - ENABLE_CONSOLE_OTP=true]`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Code: ${otp}`);
    console.log(`==================================================\n`);
    return true;
  }

  console.error(
    `[EMAIL DELIVERY FAILED] Could not deliver verification code to ${toEmail}. SMTP not configured or delivery failed.`
  );
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
    : `"Workspace Security" <${config.user}>`;

  const sent = await deliverEmail({
    from: fromAddress,
    to: toEmail,
    subject,
    html: htmlContent,
  });

  if (sent) {
    return true;
  }

  // Explicit development console logging only when allowed
  if (config.allowConsoleOtp) {
    console.log(`\n==================================================`);
    console.log(`[LOCAL DEV RESET LINK - ENABLE_CONSOLE_OTP=true]`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link: ${resetLink}`);
    console.log(`==================================================\n`);
    return true;
  }

  console.error(
    `[EMAIL DELIVERY FAILED] Could not deliver password reset email to ${toEmail}. SMTP not configured or delivery failed.`
  );
  return false;
}
