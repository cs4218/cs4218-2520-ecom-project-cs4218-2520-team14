// Teng Hui Xin Alicia, A0259064Y

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1";

// When set to true in the environment, the script will also hit
// the payment endpoint after fetching the Braintree token
const ENABLE_PAYMENT_SPIKE = __ENV.ENABLE_PAYMENT_SPIKE !== "false";

const NUM_TEST_USERS = 150;

// Custom metrics
const tokenErrors = new Counter("braintree_token_errors");
const paymentErrors = new Counter("payment_errors");
const tokenDuration = new Trend("braintree_token_duration", true);
const checkoutErrorRate = new Rate("checkout_error_rate");
const paymentReqs = new Counter("payment_reqs");
const paymentLatency = new Trend("payment_latency", true);

export const options = {
  setupTimeout: "3m",

  summaryTrendStats: [
    "avg",
    "min",
    "med",
    "max",
    "p(75)",
    "p(90)",
    "p(95)",
    "count",
  ],

  // Stage-based load profile:
  // 1. small baseline
  // 2. sudden spike to simulate flash sale traffic
  // 3. sustain high load to observe stability
  // 4. ramp down to see recovery behavior
  stages: [
    { duration: "10s", target: 10 },
    { duration: "20s", target: 150 },
    { duration: "30s", target: 150 },
    { duration: "20s", target: 0 },
  ],

  thresholds: {
    // Token endpoint should keep p90 latency below 3s
    "http_req_duration{endpoint:braintree_token}": ["p(90)<3000"],

    // Fewer than 5% of token requests should fail at the HTTP layer
    "http_req_failed{endpoint:braintree_token}": ["rate<0.05"],

    // Payment endpoint should also keep p90 latency below 3s
    "http_req_duration{endpoint:braintree_payment}": ["p(90)<3000"],

    // Fewer than 5% of payment requests should fail at the HTTP layer
    "http_req_failed{endpoint:braintree_payment}": ["rate<0.05"],

    // Combined checkout flow error rate should stay below 2%
    checkout_error_rate: ["rate<0.02"],
  },
};

// Setup: create users and pre-login to build token pool
export function setup() {
  console.log(`[setup] Creating ${NUM_TEST_USERS} checkout test users...`);

  // Stores authentication tokens for all successfully logged-in users
  const tokenPool = [];

  for (let i = 1; i <= NUM_TEST_USERS; i++) {
    const email = `checkoutspike_${i}@ecommerce.test`;
    const password = "password123";

    // Register user.
    // This allows the test to create fresh accounts so it does not depend on
    // pre-existing database users.
    http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        name: `Checkout Spike User ${i}`,
        email,
        password,
        phone: "99126299",
        address: "Singles Inferno",
        answer: "IloveNFT",
        DOB: "2000-01-01",
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    // Login user immediately after registration to obtain a token that can be
    // reused by virtual users during the actual test iterations
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email, password }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    // If login succeeds, save the returned token.
    // Otherwise store null so you can still track how many setups failed.
    if (loginRes.status === 200) {
      tokenPool.push({ token: loginRes.json().token });
    } else {
      tokenPool.push(null);
    }
  }

  console.log(`[setup] Pre-logged in ${tokenPool.length} users.`);
  console.log(`[setup] Payment spike enabled: ${ENABLE_PAYMENT_SPIKE}`);

  // Returned data is passed into the default function for each iteration
  return { tokenPool };
}

export default function (data) {
  const { tokenPool } = data;

  // Guard clause: if setup failed to produce usable tokens, skip this iteration
  if (!tokenPool || tokenPool.length === 0) {
    console.warn("No tokens available from setup! Skipping iteration.");
    sleep(1);
    return;
  }

  // Pick one random authenticated user to simulate more realistic traffic
  // distribution instead of always using the same token
  const userAuth = tokenPool[Math.floor(Math.random() * tokenPool.length)];

  // Request a Braintree client token for the selected user
  const tokenRes = http.get(`${BASE_URL}/product/braintree/token`, {
    headers: {
      Authorization: userAuth.token,
    },
    tags: { endpoint: "braintree_token" },
  });

  // Record latency of the token request
  tokenDuration.add(tokenRes.timings.duration);

  // Validate both HTTP success and expected response structure
  const tokenOk = check(tokenRes, {
    "braintree-token: status 200": (r) => r.status === 200,
    "braintree-token: returns clientToken": (r) => {
      try {
        return typeof r.json("clientToken") === "string";
      } catch (_) {
        // If the response is not valid JSON or field is missing, mark as failed
        return false;
      }
    },
  });

  // Add result into overall checkout error rate
  checkoutErrorRate.add(!tokenOk);

  // Increment endpoint-specific error counter if validation failed
  if (!tokenOk) tokenErrors.add(1);

  // Only execute payment requests when the spike mode is enabled
  if (ENABLE_PAYMENT_SPIKE) {
    // Mock payment payload.
    const paymentPayload = {
      nonce: "fake-valid-nonce",
      cart: [
        { _id: "66db427fdb0119d9234b27f1", price: 79.99, name: "Textbook" },
      ],
    };

    // Submit the payment request for the selected authenticated user
    const paymentRes = http.post(
      `${BASE_URL}/product/braintree/payment`,
      JSON.stringify(paymentPayload),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: userAuth.token,
        },
        tags: { endpoint: "braintree_payment" },
      },
    );

    // Count payment attempts and record latency
    paymentReqs.add(1);
    paymentLatency.add(paymentRes.timings.duration);

    // Check for both successful status code and business-level success flag
    const paymentOk = check(paymentRes, {
      "payment: status 200 or 201": (r) => r.status === 200 || r.status === 201,
      "payment: ok flag is true": (r) => {
        try {
          return r.json("ok") === true;
        } catch (_) {
          return false;
        }
      },
    });

    // Feed payment failures into the overall checkout error rate
    checkoutErrorRate.add(!paymentOk);

    // Track payment-specific failures separately
    if (!paymentOk) paymentErrors.add(1);

    // Small pause after checkout completes
    sleep(1);
  }
}

export function handleSummary(data) {
  // Total number of payment requests made during the test
  const reqs = data.metrics.payment_reqs
    ? data.metrics.payment_reqs.values.count
    : 0;

  // Total test duration in seconds, used to compute average request rate
  const durationSecs =
    data.state && data.state.testRunDurationMs
      ? data.state.testRunDurationMs / 1000
      : 1;

  const rps = (reqs / durationSecs).toFixed(2);

  // Grab custom metrics from the final summary object
  const tokenMetric = data.metrics.braintree_token_duration;
  const payMetric = data.metrics.payment_latency;
  const checkoutErrMetric = data.metrics.checkout_error_rate;

  // Extract p90 values if the metrics exist
  const tokenP90 =
    tokenMetric && tokenMetric.values["p(90)"] !== undefined
      ? tokenMetric.values["p(90)"].toFixed(2) + " ms"
      : "N/A";

  const payP90 =
    payMetric && payMetric.values["p(90)"] !== undefined
      ? payMetric.values["p(90)"].toFixed(2) + " ms"
      : "N/A";

  // Convert error rate to percentage for easier reading
  const err =
    checkoutErrMetric && checkoutErrMetric.values.rate !== undefined
      ? (checkoutErrMetric.values.rate * 100).toFixed(2) + " %"
      : "N/A";

  let customTable =
    "\n=================================================================================\n";
  customTable +=
    " Flow              |   Avg RPS   | p90 Response | Checkout Error Rate\n";
  customTable +=
    "---------------------------------------------------------------------------------\n";
  customTable += ` Braintree Token   | ${"N/A".padStart(11)} | ${tokenP90.padStart(12)} | ${err.padStart(19)}\n`;
  customTable += ` Payment           | ${rps.padStart(11)} | ${payP90.padStart(12)} | ${err.padStart(19)}\n`;
  customTable +=
    "=================================================================================\n\n";

  return {
    stdout:
      textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}
