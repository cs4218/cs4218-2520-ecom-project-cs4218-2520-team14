// Teng Hui Xin Alicia, A0259064Y

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const API_BASE = "http://localhost:6060/api/v1";
const NUM_TEST_USERS = 150;

const loginErrors = new Counter("login_errors");
const loginErrorRate = new Rate("login_error_rate");
const loginDuration = new Trend("login_duration", true);
const loginReqs = new Counter("login_reqs");

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

  stages: [
    { duration: "10s", target: 10 }, // baseline
    { duration: "20s", target: 150 }, // spike
    { duration: "30s", target: 150 }, // hold peak
    { duration: "20s", target: 0 }, // recovery
  ],

  thresholds: {
    "http_req_duration{endpoint:login}": ["p(90)<3000"],
    "http_req_failed{endpoint:login}": ["rate<0.05"],
    login_error_rate: ["rate<0.02"],
  },
};

// Prepare a pool of valid login credentials before the spike begins
export function setup() {
  console.log(`[setup] Creating ${NUM_TEST_USERS} login test users...`);

  const credentialPool = [];

  for (let i = 1; i <= NUM_TEST_USERS; i++) {
    const email = `loginspike_${i}@ecommerce.test`;
    const password = "password123";

    http.post(
      `${API_BASE}/auth/register`,
      JSON.stringify({
        name: `Login Spike User ${i}`,
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

    credentialPool.push({ email, password });
  }

  console.log(`[setup] Prepared ${credentialPool.length} login credentials.`);
  return { credentialPool };
}

export default function (data) {
  const { credentialPool } = data;

  if (!credentialPool || credentialPool.length === 0) {
    console.warn("No login credentials available — skipping iteration");
    sleep(1);
    return;
  }

  const userCreds =
    credentialPool[Math.floor(Math.random() * credentialPool.length)];

  const loginRes = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({
      email: userCreds.email,
      password: userCreds.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "login" },
    },
  );

  loginReqs.add(1);
  loginDuration.add(loginRes.timings.duration);

  let loginJson;
  try {
    loginJson = loginRes.json();
  } catch (_) {}

  const loginOk = check(loginRes, {
    "login: status 200": (r) => r.status === 200,
    "login: returns token": () => typeof loginJson?.token === "string",
    "login: returns user object": () =>
      loginJson !== undefined &&
      loginJson.user !== undefined &&
      typeof loginJson.user === "object",
  });

  loginErrorRate.add(!loginOk);
  if (!loginOk) loginErrors.add(1);

  sleep(Math.random() * 1.0 + 0.5);
}

export function handleSummary(data) {
  const reqs = data.metrics.login_reqs
    ? data.metrics.login_reqs.values.count
    : 0;

  const durationSecs =
    data.state && data.state.testRunDurationMs
      ? data.state.testRunDurationMs / 1000
      : 1;

  const rps = (reqs / durationSecs).toFixed(2);

  const loginMetric = data.metrics.login_duration;
  const loginErrMetric = data.metrics.login_error_rate;

  const loginP90 =
    loginMetric && loginMetric.values["p(90)"] !== undefined
      ? loginMetric.values["p(90)"].toFixed(2) + " ms"
      : "N/A";

  const err =
    loginErrMetric && loginErrMetric.values.rate !== undefined
      ? (loginErrMetric.values.rate * 100).toFixed(2) + " %"
      : "N/A";

  let customTable =
    "\n=================================================================================\n";
  customTable +=
    " Flow              |   Avg RPS   | p90 Response | Login Error Rate\n";
  customTable +=
    "---------------------------------------------------------------------------------\n";
  customTable += ` User Login        | ${rps.padStart(11)} | ${loginP90.padStart(12)} | ${err.padStart(16)}\n`;
  customTable +=
    "=================================================================================\n\n";

  return {
    stdout:
      textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}
