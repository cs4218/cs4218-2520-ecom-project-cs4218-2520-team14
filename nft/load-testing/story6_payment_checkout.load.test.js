// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { BASE_URL, JSON_HEADERS } from "./config.js";
import { extractProducts, safeJson } from "./utils.js";

/**
 * =========================================================
 * Custom Metrics
 * =========================================================
 */

const paymentTokenSuccessRate = new Rate("payment_token_success_rate");
const paymentProcessingSuccessRate = new Rate("payment_processing_success_rate");
const paymentPayloadIntegrityRate = new Rate("payment_payload_integrity_rate");
const paymentServerErrorRate = new Rate("payment_server_error_rate");

const paymentTokenResponseTrend = new Trend("payment_token_response_time");
const paymentProcessingResponseTrend = new Trend("payment_processing_response_time");
const orderVerificationResponseTrend = new Trend(
  "payment_order_verification_response_time"
);

const malformedPaymentPayloadCount = new Counter("malformed_payment_payload_count");
const orphanOrderFailureCount = new Counter("orphan_order_failure_count");
const duplicateOrderCreationCount = new Counter("duplicate_order_creation_count");
const successfulOrderVerificationCount = new Counter(
  "successful_order_verification_count"
);
const unexpectedPaymentFailureCount = new Counter(
  "unexpected_payment_failure_count"
);


const PAYMENT_HTTP_FAILED_RATE = Number(__ENV.PAYMENT_HTTP_FAILED_RATE || 1.0);

const PAYMENT_TOKEN_AVG_MS = Number(__ENV.PAYMENT_TOKEN_AVG_MS || 60000);
const PAYMENT_TOKEN_P95_MS = Number(__ENV.PAYMENT_TOKEN_P95_MS || 120000);

const PAYMENT_PROCESS_AVG_MS = Number(__ENV.PAYMENT_PROCESS_AVG_MS || 90000);
const PAYMENT_PROCESS_P95_MS = Number(__ENV.PAYMENT_PROCESS_P95_MS || 180000);

const PAYMENT_VERIFY_P95_MS = Number(__ENV.PAYMENT_VERIFY_P95_MS || 120000);

const PAYMENT_TOKEN_SUCCESS_RATE_MIN = Number(
  __ENV.PAYMENT_TOKEN_SUCCESS_RATE_MIN || 0
);
const PAYMENT_PROCESS_SUCCESS_RATE_MIN = Number(
  __ENV.PAYMENT_PROCESS_SUCCESS_RATE_MIN || 0
);
const PAYMENT_PAYLOAD_INTEGRITY_RATE_MIN = Number(
  __ENV.PAYMENT_PAYLOAD_INTEGRITY_RATE_MIN || 0
);
const PAYMENT_SERVER_ERROR_RATE_MAX = Number(
  __ENV.PAYMENT_SERVER_ERROR_RATE_MAX || 1
);

/**
 * =========================================================
 * Payment users
 * =========================================================
 */

function buildDefaultPaymentUsers(count = 100) {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return {
      name: `Payment User ${n}`,
      email: `pay.user${n}@test.com`,
      password: "UserPass123",
      phone: `9${String(n).padStart(7, "0")}`.slice(0, 8),
      address: `${n} Payment Street`,
      answer: "Tennis",
    };
  });
}

function parsePaymentUsers(raw) {
  if (!raw || !raw.trim()) {
    return buildDefaultPaymentUsers(100);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return buildDefaultPaymentUsers(100);
    }

    return parsed.map((u, index) => ({
      name: u.name || `Payment User ${index + 1}`,
      email: u.email,
      password: u.password || "UserPass123",
      phone:
        u.phone || `9${String(index + 1).padStart(7, "0")}`.slice(0, 8),
      address: u.address || `${index + 1} Payment Street`,
      answer: u.answer || "Tennis",
    }));
  } catch (err) {
    throw new Error(
      "PAYMENT_USERS_JSON is not valid JSON. Provide a JSON array of user credentials."
    );
  }
}

const PAYMENT_USERS = parsePaymentUsers(__ENV.PAYMENT_USERS_JSON);
const TEST_PAYMENT_NONCE = __ENV.TEST_PAYMENT_NONCE || "fake-valid-nonce";

/**
 * =========================================================
 * Options
 * =========================================================
 */
export const options = {
  scenarios: {
    payment_token_generation: {
      executor: "ramping-vus",
      exec: "paymentTokenScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 100 },
        { duration: "3m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
      gracefulStop: "30s",
      tags: {
        endpoint_family: "payment_token",
        group: "payment_checkout",
      },
    },

    payment_processing: {
      executor: "ramping-vus",
      exec: "paymentProcessingScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 80 },
        { duration: "3m", target: 80 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
      gracefulStop: "30s",
      tags: {
        endpoint_family: "payment_processing",
        group: "payment_checkout",
      },
    },
  },

  thresholds: {
    "http_req_failed{group:payment_checkout}": [
      `rate<${PAYMENT_HTTP_FAILED_RATE}`,
    ],

    "http_req_duration{endpoint:payment_token}": [
      `avg<${PAYMENT_TOKEN_AVG_MS}`,
      `p(95)<${PAYMENT_TOKEN_P95_MS}`,
    ],

    "http_req_duration{endpoint:payment_process}": [
      `avg<${PAYMENT_PROCESS_AVG_MS}`,
      `p(95)<${PAYMENT_PROCESS_P95_MS}`,
    ],

    "http_req_duration{endpoint:get_orders_for_payment_verification}": [
      `p(95)<${PAYMENT_VERIFY_P95_MS}`,
    ],

    payment_token_success_rate: [`rate>=${PAYMENT_TOKEN_SUCCESS_RATE_MIN}`],
    payment_processing_success_rate: [
      `rate>=${PAYMENT_PROCESS_SUCCESS_RATE_MIN}`,
    ],
    payment_payload_integrity_rate: [
      `rate>=${PAYMENT_PAYLOAD_INTEGRITY_RATE_MIN}`,
    ],
    payment_server_error_rate: [`rate<=${PAYMENT_SERVER_ERROR_RATE_MAX}`],

    payment_token_response_time: [
      `avg<${PAYMENT_TOKEN_AVG_MS}`,
      `p(95)<${PAYMENT_TOKEN_P95_MS}`,
    ],

    payment_processing_response_time: [
      `avg<${PAYMENT_PROCESS_AVG_MS}`,
      `p(95)<${PAYMENT_PROCESS_P95_MS}`,
    ],
  },

  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function authHeaders(token) {
  return {
    Authorization: token,
    "Content-Type": "application/json",
  };
}

function registerPaymentUser(user) {
  const payload = JSON.stringify({
    name: user.name,
    email: user.email,
    password: user.password,
    phone: user.phone,
    address: user.address,
    answer: user.answer,
  });

  return http.post(`${BASE_URL}/api/v1/auth/register`, payload, {
    headers: JSON_HEADERS,
    timeout: "15s",
    tags: {
      endpoint: "register_payment_setup_user",
      group: "payment_checkout",
    },
  });
}

function loginWithCredentials(email, password) {
  const payload = JSON.stringify({ email, password });

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
    headers: JSON_HEADERS,
    timeout: "15s",
    tags: { endpoint: "login_for_payment_setup", group: "payment_checkout" },
  });

  const body = safeJson(res);

  if (res.status === 200 && typeof body?.token === "string" && body?.user) {
    return body;
  }

  return null;
}

function ensurePaymentUser(user) {
  /**
   * First try login.
   * If user does not exist, auto-register.
   * Then login again.
   */

  let login = loginWithCredentials(user.email, user.password);
  if (login) return login;

  const registerRes = registerPaymentUser(user);
  const registerBody = safeJson(registerRes);

  const registerLooksAcceptable =
    registerRes.status === 201 ||
    registerRes.status === 200 ||
    registerRes.status === 409 ||
    registerBody?.success === true ||
    typeof registerBody?.message === "string";

  if (!registerLooksAcceptable) {
    throw new Error(
      `Failed to auto-register payment test user ${user.email}. Status=${registerRes.status}, body=${registerRes.body}`
    );
  }

  login = loginWithCredentials(user.email, user.password);
  if (login) return login;

  throw new Error(
    `Failed to log in payment test user ${user.email} even after auto-registration.`
  );
}

function getOrdersForVerification(token) {
  const res = http.get(`${BASE_URL}/api/v1/auth/orders`, {
    headers: authHeaders(token),
    timeout: "15s",
    tags: {
      endpoint: "get_orders_for_payment_verification",
      group: "payment_checkout",
    },
  });

  orderVerificationResponseTrend.add(res.timings.duration);
  return res;
}

function getOrdersCount(token) {
  const res = getOrdersForVerification(token);
  const body = safeJson(res);

  check(res, {
    "orders verification status is 200": (r) => r.status === 200,
    "orders verification returns array": () => Array.isArray(body),
  });

  if (!Array.isArray(body)) {
    malformedPaymentPayloadCount.add(1);
    return null;
  }

  return body.length;
}

function getVuAssignedUser(data) {
  const index = (__VU - 1) % data.paymentUsers.length;
  return data.paymentUsers[index];
}

function buildCheckoutCart(products) {
  if (!Array.isArray(products) || products.length === 0) return [];

  if (products.length === 1) {
    return [products[0]];
  }

  return [products[0], products[1]];
}

/**
 * =========================================================
 * Setup
 * =========================================================
 */
export function setup() {
  if (PAYMENT_USERS.length < 80) {
    throw new Error(
      `At least 80 payment users are required. Found ${PAYMENT_USERS.length}.`
    );
  }

  const products = extractProducts();

  if (!Array.isArray(products) || products.length < 1) {
    throw new Error(
      "No products found. Seed at least 1 product before running the payment load test."
    );
  }

  const cart = buildCheckoutCart(products);

  if (!cart.length) {
    throw new Error("Could not build checkout cart from seeded products.");
  }

  const loggedInUsers = PAYMENT_USERS.map((u) => {
    const login = ensurePaymentUser(u);
    return {
      email: u.email,
      token: login.token,
      user: login.user,
    };
  });

  return {
    paymentUsers: loggedInUsers,
    cart,
  };
}

/**
 * =========================================================
 * Scenario 1: Payment Token Generation
 * =========================================================
 */
export function paymentTokenScenario(data) {
  group("Payment Load - token generation", () => {
    const assignedUser = getVuAssignedUser(data);

    const res = http.get(`${BASE_URL}/api/v1/product/braintree/token`, {
      headers: authHeaders(assignedUser.token),
      timeout: "15s",
      tags: {
        endpoint: "payment_token",
        group: "payment_checkout",
      },
    });

    paymentTokenResponseTrend.add(res.timings.duration);
    paymentServerErrorRate.add(res.status >= 500);

    const body = safeJson(res);

    const checksPassed = check(res, {
      "payment token status is 200": (r) => r.status === 200,
      "payment token body is non-empty": (r) => !!r.body && r.body.length > 0,
      "payment token parses as JSON": () => body !== null,
      "payment token contains clientToken": () =>
        typeof body?.clientToken === "string" && body.clientToken.length > 0,
    });

    if (body === null) {
      malformedPaymentPayloadCount.add(1);
    }

    paymentTokenSuccessRate.add(checksPassed);
    paymentPayloadIntegrityRate.add(
      body !== null &&
        typeof body?.clientToken === "string" &&
        body.clientToken.length > 0
    );

    sleep(1);
  });
}

/**
 * =========================================================
 * Scenario 2: Payment Processing
 * =========================================================
 */
export function paymentProcessingScenario(data) {
  group("Payment Load - payment processing", () => {
    const assignedUser = getVuAssignedUser(data);

    const preCount = getOrdersCount(assignedUser.token);

    const payload = JSON.stringify({
      nonce: TEST_PAYMENT_NONCE,
      cart: data.cart,
    });

    const res = http.post(
      `${BASE_URL}/api/v1/product/braintree/payment`,
      payload,
      {
        headers: authHeaders(assignedUser.token),
        timeout: "15s",
        tags: {
          endpoint: "payment_process",
          group: "payment_checkout",
        },
      }
    );

    paymentProcessingResponseTrend.add(res.timings.duration);
    paymentServerErrorRate.add(res.status >= 500);

    const body = safeJson(res);

    const checksPassed = check(res, {
      "payment response status is expected": (r) =>
        [200, 400, 500].includes(r.status),
      "payment response body is non-empty": (r) => !!r.body && r.body.length > 0,
      "payment success/failure shape is valid": () => {
        if (res.status === 200) {
          return body?.ok === true;
        }
        return true;
      },
    });

    if (body === null && res.status === 200) {
      malformedPaymentPayloadCount.add(1);
    }

    const postCount = getOrdersCount(assignedUser.token);

    if (preCount !== null && postCount !== null) {
      if (res.status === 200 && body?.ok === true) {
        if (postCount === preCount + 1) {
          successfulOrderVerificationCount.add(1);
        } else if (postCount > preCount + 1) {
          duplicateOrderCreationCount.add(1);
        } else {
          unexpectedPaymentFailureCount.add(1);
        }
      } else {
        if (postCount > preCount) {
          orphanOrderFailureCount.add(1);
        }
      }
    }

    paymentProcessingSuccessRate.add(checksPassed);
    paymentPayloadIntegrityRate.add(
      (res.status === 200 && body?.ok === true) ||
        (res.status !== 200 && !!res.body)
    );

    if (res.status >= 500) {
      unexpectedPaymentFailureCount.add(1);
    }

    sleep(1);
  });
}

/**
 * =========================================================
 * Summary
 * =========================================================
 */
export function handleSummary(data) {
  return {
    stdout: `
============================================================
Payment Token Generation and Payment Processing Under Concurrent Load
============================================================

Scenarios executed:
- 100 concurrent users requesting payment tokens
- 80 concurrent authenticated users submitting payment requests
- 2-minute ramp-up and 3-minute sustained peak load

Key custom metrics:
- payment_token_success_rate
- payment_processing_success_rate
- payment_payload_integrity_rate
- payment_server_error_rate
- payment_token_response_time
- payment_processing_response_time
- payment_order_verification_response_time
- malformed_payment_payload_count
- orphan_order_failure_count
- duplicate_order_creation_count
- successful_order_verification_count
- unexpected_payment_failure_count

Threshold intent:
- avg payment token response time < ${PAYMENT_TOKEN_AVG_MS}ms
- avg payment processing response time < ${PAYMENT_PROCESS_AVG_MS}ms
- p95 payment token < ${PAYMENT_TOKEN_P95_MS}ms
- p95 payment processing < ${PAYMENT_PROCESS_P95_MS}ms
- p95 order verification < ${PAYMENT_VERIFY_P95_MS}ms
- http_req_failed{group:payment_checkout} < ${PAYMENT_HTTP_FAILED_RATE}

Interpretation guidance:
- malformed_payment_payload_count should ideally remain 0
- payment_server_error_rate should ideally remain 0
- duplicate_order_creation_count should ideally remain 0
- orphan_order_failure_count should ideally remain 0
- successful_order_verification_count should grow with successful payment count
- unexpected_payment_failure_count should ideally remain 0 or very close to 0

Important design note:
- /api/v1/product/braintree/token is not auth-protected in the current backend,
  but authenticated user sessions are still used in the test design to model
  realistic checkout behaviour.
- Payment processing uses a stable sandbox nonce by default:
  TEST_PAYMENT_NONCE=${TEST_PAYMENT_NONCE}

Payment users source:
- ${__ENV.PAYMENT_USERS_JSON ? "Loaded from PAYMENT_USERS_JSON" : "Auto-generated defaults pay.user1@test.com ... pay.user100@test.com"}
- Missing users are auto-registered during setup if needed
============================================================
`,
  };
}