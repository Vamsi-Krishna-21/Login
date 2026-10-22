import assert from "node:assert/strict";
import { test } from "node:test";
import nodemailer from "nodemailer";
import { User } from "../models/User.js";
import { getEmailConfig } from "../config/env.js";
import {
  getTransporter,
  sendOtpEmail,
  sendResetPasswordEmail,
  verifyEmailTransporter,
} from "../utils/email.js";
import {
  forgotPassword,
  requestEmailChange,
  requestPasswordChange,
} from "../controllers/authController.js";

const smtpVariables = [
  "NODE_ENV",
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_FROM",
  "EMAIL_SERVICE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "JWT_SECRET",
  "APP_URL",
];
let testAccountNumber = 0;

function configureTestEnvironment(t, { credentials = true } = {}) {
  const originalValues = Object.fromEntries(
    smtpVariables.map((name) => [name, process.env[name]])
  );
  t.after(() => {
    for (const [name, value] of Object.entries(originalValues)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  for (const name of smtpVariables) delete process.env[name];
  process.env.NODE_ENV = "test";
  process.env.SMTP_HOST = "smtp.gmail.com";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_SECURE = "true";
  process.env.JWT_SECRET = "unit-test-secret-that-is-not-used-in-production";
  process.env.APP_URL = "https://frontend.example.test";
  if (credentials) {
    testAccountNumber += 1;
    process.env.SMTP_USER = `test-account-${testAccountNumber}@gmail.com`;
    process.env.SMTP_PASS = `test-app-password-${testAccountNumber}`;
  }
}

function stubUserMethod(t, name, implementation) {
  const original = User[name];
  User[name] = implementation;
  t.after(() => { User[name] = original; });
}

function installTransportMock(t, { sendError, verifyError, onSend } = {}) {
  const optionsSeen = [];
  let activeSendError = sendError;
  let verify = async () => {
    if (verifyError) throw verifyError;
  };
  t.mock.method(nodemailer, "createTransport", (options) => {
    optionsSeen.push(options);
    return {
      sendMail: async (mail) => {
        onSend?.(mail);
        const error = typeof activeSendError === "function"
          ? activeSendError(options, mail)
          : activeSendError;
        if (error) throw error;
        return { accepted: [mail.to], rejected: [] };
      },
      verify: (...args) => verify(...args),
    };
  });
  return {
    optionsSeen,
    setSendError(error) {
      activeSendError = error;
    },
    setVerifyError(error) {
      verify = async () => {
        if (error) throw error;
      };
    },
  };
}

function captureLogs(t) {
  const errors = [];
  const logs = [];
  t.mock.method(console, "error", (...values) => errors.push(values.join(" ")));
  t.mock.method(console, "log", (...values) => logs.push(values.join(" ")));
  return { errors, logs };
}

function mockResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function fakeUser() {
  return {
    _id: "test-user-id",
    email: "recipient@example.test",
    password: "stored-password",
    save: async () => {},
    comparePassword: async () => false,
  };
}

test("missing SMTP credentials are diagnosed without attempting transport creation", async (t) => {
  configureTestEnvironment(t, { credentials: false });
  const { errors } = captureLogs(t);
  const transports = installTransportMock(t);

  assert.equal(getEmailConfig().configurationIssue, "missing-credentials");
  assert.equal(await sendOtpEmail("recipient@example.test", "123456", "email-change"), false);
  assert.equal((await verifyEmailTransporter()).verified, false);
  assert.equal(transports.optionsSeen.length, 0);
  assert.match(errors.join("\n"), /missing_configuration/);
  assert.doesNotMatch(errors.join("\n"), /123456|recipient@example\.test/);
});

test("conflicting EMAIL_* and SMTP_* credentials fail closed", async (t) => {
  configureTestEnvironment(t);
  process.env.EMAIL_USER = "stale-account@gmail.com";
  process.env.EMAIL_PASS = "stale-test-password";
  const { errors } = captureLogs(t);
  const transports = installTransportMock(t);

  assert.equal(getEmailConfig().configurationIssue, "conflicting-credentials");
  assert.equal(await sendOtpEmail("recipient@example.test", "123456", "email-change"), false);
  assert.equal(transports.optionsSeen.length, 0);
  assert.match(errors.join("\n"), /conflicting_credentials/);
  assert.doesNotMatch(errors.join("\n"), /stale-account|stale-test-password|recipient@example\.test|123456/);
});

test("transporter creation uses secure Gmail settings and rebuilds after credentials change", (t) => {
  configureTestEnvironment(t);
  const transports = installTransportMock(t);

  assert.ok(getTransporter());
  assert.equal(transports.optionsSeen.length, 1);
  assert.equal(transports.optionsSeen[0].host, "smtp.gmail.com");
  assert.equal(transports.optionsSeen[0].port, 465);
  assert.equal(transports.optionsSeen[0].secure, true);
  assert.equal(transports.optionsSeen[0].tls.rejectUnauthorized, true);

  process.env.SMTP_PASS = "rotated-test-password";
  assert.ok(getTransporter());
  assert.equal(transports.optionsSeen.length, 2);
  assert.equal(transports.optionsSeen[1].auth.pass, "rotated-test-password");
});

test("successful submission uses EMAIL_FROM and logs no recipient", async (t) => {
  configureTestEnvironment(t);
  process.env.EMAIL_FROM = "verified-sender@gmail.com";
  const logs = captureLogs(t);
  let submittedMessage;
  installTransportMock(t, { onSend: (mail) => { submittedMessage = mail; } });

  assert.equal(
    await sendResetPasswordEmail("recipient@example.test", "https://frontend.example.test/reset/token"),
    true
  );
  assert.equal(submittedMessage.from, '"Workspace Security" <verified-sender@gmail.com>');
  assert.match(logs.logs.join("\n"), /email\.smtp\.submission_accepted/);
  assert.doesNotMatch(logs.logs.join("\n"), /recipient@example\.test|reset\/token/);
});

test("authentication failure is categorized, does not retry, and does not log secrets", async (t) => {
  configureTestEnvironment(t);
  const logs = captureLogs(t);
  const transportError = Object.assign(
    new Error("Invalid login for recipient@example.test using test-app-password"),
    { code: "EAUTH", responseCode: 535, command: "AUTH PLAIN" }
  );
  const transports = installTransportMock(t, { sendError: transportError });

  assert.equal(
    await sendResetPasswordEmail("recipient@example.test", "https://frontend.example.test/reset/private-token"),
    false
  );
  assert.equal(transports.optionsSeen.length, 1);
  const output = logs.errors.join("\n");
  assert.match(output, /authentication_failure/);
  assert.match(output, /535/);
  assert.doesNotMatch(output, /recipient@example\.test|test-app-password|private-token/);
});

test("connection failure retries on port 587 with required STARTTLS", async (t) => {
  configureTestEnvironment(t);
  const logs = captureLogs(t);
  const transports = installTransportMock(t, {
    sendError: Object.assign(new Error("Connection timed out"), { code: "ETIMEDOUT" }),
  });

  assert.equal(await sendOtpEmail("recipient@example.test", "123456", "password-change"), false);
  assert.equal(transports.optionsSeen.length, 2);
  assert.equal(transports.optionsSeen[1].port, 587);
  assert.equal(transports.optionsSeen[1].secure, false);
  assert.equal(transports.optionsSeen[1].requireTLS, true);
  assert.equal(transports.optionsSeen[1].tls.rejectUnauthorized, true);
  assert.match(logs.errors.join("\n"), /connection_failure/);
  assert.doesNotMatch(logs.errors.join("\n"), /recipient@example\.test|123456/);
});

test("port 587 fallback can accept a message after a port 465 connection failure", async (t) => {
  configureTestEnvironment(t);
  const logs = captureLogs(t);
  const transports = installTransportMock(t, {
    sendError: (options) => options.port === 465
      ? Object.assign(new Error("Connection refused"), { code: "ECONNREFUSED" })
      : null,
  });

  assert.equal(
    await sendResetPasswordEmail("recipient@example.test", "https://frontend.example.test/reset/token"),
    true
  );
  assert.deepEqual(transports.optionsSeen.map((options) => options.port), [465, 587]);
  assert.match(logs.logs.join("\n"), /"port":587/);
  assert.doesNotMatch(logs.logs.join("\n"), /recipient@example\.test|reset\/token/);
});

test("TLS failures are diagnosed without logging the raw server message", async (t) => {
  configureTestEnvironment(t);
  const logs = captureLogs(t);
  const tlsError = Object.assign(
    new Error("TLS certificate failed for recipient@example.test"),
    { code: "ESOCKET", command: "CONN" }
  );
  const transports = installTransportMock(t, { verifyError: tlsError });

  assert.equal((await verifyEmailTransporter()).verified, false);
  assert.equal(transports.optionsSeen.length, 1);
  const output = logs.errors.join("\n");
  assert.match(output, /tls_failure/);
  assert.doesNotMatch(output, /certificate failed|recipient@example\.test/);
});

test("all three email-triggering controller flows return success or generic failure", async (t) => {
  configureTestEnvironment(t);
  const logs = captureLogs(t);
  let shouldFailDelivery = false;
  let activeFlow = "";
  const transports = installTransportMock(t, {
    onSend: () => {
      if (shouldFailDelivery) {
        throw Object.assign(new Error("SMTP temporary failure"), { code: "ECONNECTION" });
      }
    },
  });
  const user = fakeUser();
  stubUserMethod(t, "findById", async () => user);
  stubUserMethod(t, "findOne", async () => activeFlow === "forgot" ? user : null);
  process.env.JWT_SECRET = "a-test-jwt-secret-that-must-not-appear-in-logs";

  const flows = [
    {
      name: "email change",
      handler: requestEmailChange,
      request: { user: { id: "test-user-id" }, body: { email: "new-address@example.test" } },
    },
    {
      name: "password change",
      handler: requestPasswordChange,
      request: { user: { id: "test-user-id" }, body: { password: "NewPassword!123" } },
    },
    {
      name: "forgot password",
      handler: forgotPassword,
      request: { body: { email: "recipient@example.test" } },
    },
  ];

  for (const flow of flows) {
    activeFlow = flow.name === "forgot password" ? "forgot" : flow.name;
    for (const failDelivery of [false, true]) {
      shouldFailDelivery = failDelivery;
      const response = mockResponse();
      await flow.handler(flow.request, response);
      assert.equal(
        response.statusCode,
        failDelivery ? 502 : 200,
        `${flow.name} failure=${failDelivery}: ${JSON.stringify(response.body)}`
      );
      if (failDelivery) {
        assert.doesNotMatch(JSON.stringify(response.body), /SMTP temporary failure|ECONNECTION/);
      }
    }
  }

  assert.equal(transports.optionsSeen.length, 4);
  assert.equal(transports.optionsSeen.filter((options) => options.port === 587).length, 3);
  assert.doesNotMatch(logs.errors.join("\n"), /recipient@example\.test|new-address@example\.test|NewPassword|123456/);
});
