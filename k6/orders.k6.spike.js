// Teng Hui Xin Alicia, A0259064Y

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const API_BASE = "http://localhost:6060/api/v1";
const NUM_TEST_USERS = 150;

const orderErrors = new Counter("order_errors");
const orderErrorRate = new Rate("order_error_rate");
const orderDuration = new Trend("order_duration", true);
const orderReqs = new Counter("order_reqs");

export const options = {
  setupTimeout: "3m",
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],

  stages: [
    { duration: "10s", target: 10 },
    { duration: "20s", target: 150 },
    { duration: "30s", target: 150 },
    { duration: "20s", target: 0 },
  ],

  thresholds: {
    "http_req_duration{endpoint:orders}": ["p(90)<3000"],
    "http_req_failed{endpoint:orders}": ["rate<0.05"],
    order_error_rate: ["rate<0.02"],
  },
};

export function setup() {
  console.log(`[setup] Creating ${NUM_TEST_USERS} orders test users...`);
  const tokenPool = [];

  for (let i = 1; i <= NUM_TEST_USERS; i++) {
    const email = `orderspike_${i}@ecommerce.test`;
    const password = "password123";

    http.post(
      `${API_BASE}/auth/register`,
      JSON.stringify({
        name: `Orders Spike User ${i}`,
        email,
        password,
        phone: "99126299",
        address: "Singles Inferno",
        answer: "IloveNFT",
        DOB: "2000-01-01",
      }),
      { headers: { "Content-Type": "application/json" } }
    );

    const loginRes = http.post(
      `${API_BASE}/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { "Content-Type": "application/json" } }
    );

    if (loginRes.status === 200) {
      tokenPool.push({ token: loginRes.json().token });
    }
  }

  console.log(`[setup] Pre-logged in ${tokenPool.length} users.`);
  return { tokenPool };
}

export default function (data) {
  const validTokens = (data.tokenPool || []).filter((u) => u && u.token);

  if (validTokens.length === 0) {
    console.warn("No valid tokens available — skipping iteration");
    sleep(1);
    return;
  }

  const userAuth = validTokens[Math.floor(Math.random() * validTokens.length)];

  const orderRes = http.get(`${API_BASE}/auth/orders`, {
    headers: {
      Authorization: userAuth.token,
    },
    tags: { endpoint: "orders" },
  });

  orderReqs.add(1);
  orderDuration.add(orderRes.timings.duration);

  let orderJson;
  try {
    orderJson = orderRes.json();
  } catch (_) {}

  const orderOk = check(orderRes, {
    "orders: status 200": (r) => r.status === 200,
    "orders: returns array or object": () =>
      Array.isArray(orderJson) ||
      (orderJson !== null && typeof orderJson === "object"),
  });

  orderErrorRate.add(!orderOk);
  if (!orderOk) orderErrors.add(1);

  sleep(Math.random() * 1.0 + 0.5);
}

export function handleSummary(data) {
  const reqs = data.metrics.order_reqs ? data.metrics.order_reqs.values.count : 0;

  const durationSecs =
    data.state && data.state.testRunDurationMs
      ? data.state.testRunDurationMs / 1000
      : 1;

  const rps = (reqs / durationSecs).toFixed(2);

  const metric = data.metrics.order_duration;
  const errMetric = data.metrics.order_error_rate;

  const p90 =
    metric && metric.values["p(90)"] !== undefined
      ? metric.values["p(90)"].toFixed(2) + " ms"
      : "N/A";

  const err =
    errMetric && errMetric.values.rate !== undefined
      ? (errMetric.values.rate * 100).toFixed(2) + " %"
      : "N/A";

  let customTable = "\n=================================================================================\n";
  customTable += " Flow              |   Avg RPS   | p90 Response | Order Error Rate\n";
  customTable += "---------------------------------------------------------------------------------\n";
  customTable += ` User Orders       | ${rps.padStart(11)} | ${p90.padStart(12)} | ${err.padStart(16)}\n`;
  customTable += "=================================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}