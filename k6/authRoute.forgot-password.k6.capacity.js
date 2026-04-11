// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/auth";
const PASSWORD = "password123";

const users = Array.from({ length: 200 }, (_, i) => ({
  email: `User${i + 1}@test.com`,
  answer: `Answer ${i + 1}`,
  newPassword: PASSWORD,
}));

const forgotPasswordLatency = new Trend("forgot_password_latency", true);
const forgotPasswordTTFB = new Trend("forgot_password_ttfb", true);
const forgotPasswordErrorRate = new Rate("forgot_password_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    forgot_password_10: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "10s" },
        { target: 10, duration: "50s" },
      ],
      exec: "forgotPasswordTest",
      tags: { endpoint: "forgot-password", load: "10" },
    },
    forgot_password_50: {
      executor: "ramping-vus",
      startVUs: 10,
      startTime: "1m",
      stages: [
        { target: 50, duration: "10s" },
        { target: 50, duration: "50s" },
      ],
      exec: "forgotPasswordTest",
      tags: { endpoint: "forgot-password", load: "50" },
    },
    forgot_password_100: {
      executor: "ramping-vus",
      startVUs: 50,
      startTime: "2m",
      stages: [
        { target: 100, duration: "10s" },
        { target: 100, duration: "50s" },
      ],
      exec: "forgotPasswordTest",
      tags: { endpoint: "forgot-password", load: "100" },
    },
    forgot_password_150: {
      executor: "ramping-vus",
      startVUs: 100,
      startTime: "3m",
      stages: [
        { target: 150, duration: "10s" },
        { target: 150, duration: "50s" },
      ],
      exec: "forgotPasswordTest",
      tags: { endpoint: "forgot-password", load: "150" },
    },
    forgot_password_200: {
      executor: "ramping-vus",
      startVUs: 150,
      startTime: "4m",
      stages: [
        { target: 200, duration: "10s" },
        { target: 200, duration: "50s" },
      ],
      exec: "forgotPasswordTest",
      tags: { endpoint: "forgot-password", load: "200" },
    },
    forgot_password_250: {
      executor: "ramping-vus",
      startVUs: 200,
      startTime: "5m",
      stages: [
        { target: 250, duration: "10s" },
        { target: 250, duration: "50s" },
      ],
      exec: "forgotPasswordTest",
      tags: { endpoint: "forgot-password", load: "250" },
    },
  },
  thresholds: {
    // Response Time Thresholds per Load
    "http_req_duration{endpoint:forgot-password,load:10}": ["p(75)<1000"],
    "http_req_duration{endpoint:forgot-password,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:forgot-password,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:forgot-password,load:150}": ["p(75)<1000"],
    "http_req_duration{endpoint:forgot-password,load:200}": ["p(75)<1000"],
    "http_req_duration{endpoint:forgot-password,load:250}": ["p(75)<1000"],

    // Error Rate Thresholds per Load
    "http_req_failed{endpoint:forgot-password,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:forgot-password,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:forgot-password,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:forgot-password,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:forgot-password,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:forgot-password,load:250}": ["rate<0.01"],

    // Counter Tracking (Essential for calculating RPS in handleSummary)
    "http_reqs{endpoint:forgot-password,load:10}": ["count>=0"],
    "http_reqs{endpoint:forgot-password,load:50}": ["count>=0"],
    "http_reqs{endpoint:forgot-password,load:100}": ["count>=0"],
    "http_reqs{endpoint:forgot-password,load:150}": ["count>=0"],
    "http_reqs{endpoint:forgot-password,load:200}": ["count>=0"],
    "http_reqs{endpoint:forgot-password,load:250}": ["count>=0"],
  },
};

export function forgotPasswordTest() {
  const user = users[(__VU - 1) % users.length];

  const payload = JSON.stringify({
    email: user.email,
    answer: user.answer,
    newPassword: user.newPassword,
  });

  const params = {
    headers: { "Content-Type": "application/json" },
    tags: { endpoint: "forgot-password" },
  };

  const res = http.post(`${BASE_URL}/forgot-password`, payload, params);

  check(res, {
    "forgot password status is 200": (r) => r.status === 200,
  });

  forgotPasswordLatency.add(res.timings.duration);
  forgotPasswordTTFB.add(res.timings.waiting);
  forgotPasswordErrorRate.add(res.status !== 200);

  sleep(1);
}

// Generates the custom table and full summary
export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200", "250"];

  let customTable = "\n=========================================================================\n";
  // UPDATED: Table Header changed to p75
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:forgot-password,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);

    // UPDATED: Extract p75 instead of p90
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | forgot-password\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run authRoute.forgot-password.k6.capacity.js