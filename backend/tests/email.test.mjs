import assert from "node:assert/strict";
import { test } from "node:test";
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

const environmentVariables = [
  "NODE_ENV",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "JWT_SECRET",
  "APP_URL",
];
let testKeyNumber = 0;

function configureTestEnvironment(t, { apiKey = true, sender = true } = {}) {
  const originalValues = Object.fromEntries(
    environmentVariables.map((name) => [name, process.env[name]])
  );
  t.after(() => {
    for (const [name, value] of Object.entries(originalValues)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  for (const name of environmentVariables) delete process.env[name];
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "unit-test-secret-that-is-not-used-in-production";
  process.env.APP_URL = "https://frontend.example.test";
  if (apiKey) {
    testKeyNumber += 1;
    process.env.RESEND_API_KEY = `re_test_api_key_${testKeyNumber}`;
  }
  if (sender) {
    process.env.EMAIL_FROM = `Workspace Test <no-reply-${testKeyNumber}@verified.example.test>`;
  }
}

function installResendMock(t, handler) {
  const client = getTransporter();
  assert.ok(client);
  const sendDescriptor = Object.getOwnPropertyDescriptor(client.emails, "send");
  Object.defineProperty(client.emails, "send", {
    configurable: true,
    value: async (payload) => handler(payload),
  });
  t.after(() => {
    if (sendDescriptor) Object.defineProperty(client.emails, "send", sendDescriptor);
    else delete client.emails.send;
  });
  return client;
}

function captureLogs(t) {
  const errors = [];
  const logs = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...values) => errors.push(values.join(" "));
  console.log = (...values) => logs.push(values.join(" "));
  t.after(() => {
    console.error = originalError;
    console.log = originalLog;
  });
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

function stubUserMethod(t, name, implementation) {
  const original = User[name];
  User[name] = implementation;
  t.after(() => { User[name] = original; });
}

test("missing API key is diagnosed and no Resend client is created", async (t) => {
  configureTestEnvironment(t, { apiKey: false });
  const { errors } = captureLogs(t);

  assert.equal(getEmailConfig().configurationIssue, "missing-api-key");
  assert.equal(getTransporter(), null);
  assert.equal(await sendOtpEmail("recipient@example.test", "123456", "email-change"), false);
  assert.equal((await verifyEmailTransporter()).verified, false);
  assert.match(errors.join("\n"), /missing-api-key/);
  assert.doesNotMatch(errors.join("\n"), /123456|recipient@example\.test/);
});

test("missing sender is diagnosed without claiming successful delivery", async (t) => {
  configureTestEnvironment(t, { sender: false });
  const { errors } = captureLogs(t);

  assert.equal(getEmailConfig().configurationIssue, "missing-sender");
  assert.equal(await sendResetPasswordEmail(
    "recipient@example.test",
    "https://frontend.example.test/reset/private-token"
  ), false);
  assert.match(errors.join("\n"), /missing-sender/);
  assert.doesNotMatch(errors.join("\n"), /recipient@example\.test|private-token/);
});

test("Resend client is recreated when the API key changes", (t) => {
  configureTestEnvironment(t);
  const originalClient = getTransporter();
  process.env.RESEND_API_KEY = "re_test_rotated_api_key";

  assert.notEqual(getTransporter(), originalClient);
});

test("successful email submissions preserve sender, recipient, subject and template", async (t) => {
  configureTestEnvironment(t);
  const { logs } = captureLogs(t);
  const submitted = [];
  installResendMock(t, async (payload) => {
    submitted.push(payload);
    return {
      data: { id: `email-id-${submitted.length}` },
      error: null,
      headers: { "x-request-id": "request-123" },
    };
  });

  assert.equal(await sendOtpEmail("recipient@example.test", "123456", "email-change"), true);
  assert.equal(await sendOtpEmail("recipient@example.test", "654321", "password-change"), true);
  assert.equal(
    await sendResetPasswordEmail(
      "recipient@example.test",
      "https://frontend.example.test/reset/private-token"
    ),
    true
  );
  assert.equal(submitted.length, 3);
  assert.equal(submitted[0].from, process.env.EMAIL_FROM);
  assert.equal(submitted[0].to, "recipient@example.test");
  assert.match(submitted[0].subject, /Verify Your New Email Address/);
  assert.match(submitted[0].html, /123456/);
  assert.match(submitted[1].subject, /Password Change Verification Code/);
  assert.match(submitted[1].html, /654321/);
  assert.match(submitted[2].subject, /Reset Your Password/);
  assert.match(submitted[2].html, /private-token/);
  assert.match(logs.join("\n"), /email\.resend\.accepted/);
  assert.match(logs.join("\n"), /request-123/);
  assert.doesNotMatch(logs.join("\n"), /recipient@example\.test|123456|654321|private-token/);
});

test("Resend API errors return failure and log only safe status, category and request ID", async (t) => {
  configureTestEnvironment(t);
  const { errors } = captureLogs(t);
  installResendMock(t, async () => ({
    data: null,
    error: {
      name: "invalid_from_address",
      statusCode: 403,
      message: "Rejected recipient@example.test with API key re_secret",
    },
    headers: { "x-request-id": "request-error-456" },
  }));

  assert.equal(
    await sendResetPasswordEmail(
      "recipient@example.test",
      "https://frontend.example.test/reset/private-token"
    ),
    false
  );
  const output = errors.join("\n");
  assert.match(output, /password-reset/);
  assert.match(output, /403/);
  assert.match(output, /authentication_or_authorization_failure/);
  assert.match(output, /request-error-456/);
  assert.doesNotMatch(output, /recipient@example\.test|re_secret|private-token|Rejected/);
});

test("thrown Resend request errors return failure without logging the exception message", async (t) => {
  configureTestEnvironment(t);
  const { errors } = captureLogs(t);
  installResendMock(t, async () => {
    throw Object.assign(
      new Error("Request for recipient@example.test used key re_secret"),
      { name: "TypeError" }
    );
  });

  assert.equal(
    await sendOtpEmail("recipient@example.test", "987654", "password-change"),
    false
  );
  const output = errors.join("\n");
  assert.match(output, /password-change/);
  assert.match(output, /network_or_sdk_error/);
  assert.doesNotMatch(output, /recipient@example\.test|987654|re_secret|Request for/);
});

test("all email-triggering controller flows retain success and generic failure behavior", async (t) => {
  configureTestEnvironment(t);
  const { errors } = captureLogs(t);
  let shouldFailDelivery = false;
  let activeFlow = "";
  installResendMock(t, async () => shouldFailDelivery
    ? {
        data: null,
        error: {
          name: "application_error",
          statusCode: 503,
          message: "Provider internal detail",
        },
        headers: null,
      }
    : { data: { id: "accepted-email-id" }, error: null, headers: null });

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
        assert.doesNotMatch(JSON.stringify(response.body), /Provider internal detail|application_error/);
      }
    }
  }

  assert.doesNotMatch(
    errors.join("\n"),
    /recipient@example\.test|new-address@example\.test|NewPassword|123456|Provider internal detail/
  );
});
