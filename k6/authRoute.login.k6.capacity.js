// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/auth";
const PASSWORD = "password123";

const users = Array.from({ length: 200 }, (_, i) => ({
  email: `User${i + 1}@test.com`,
  password: PASSWORD,
}));

const loginLatency = new Trend("login_latency", true);
const loginTTFB = new Trend("login_ttfb", true);
const loginErrorRate = new Rate("login_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    login_10: {
      executor: "constant-vus",
      vus: 10,
      duration: "1m",
      exec: "loginTest",
      tags: { endpoint: "login", load: "10" },
    },
    login_50: {
      executor: "constant-vus",
      vus: 50,
      duration: "1m",
      startTime: "1m",
      exec: "loginTest",
      tags: { endpoint: "login", load: "50" },
    },
    login_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "1m",
      startTime: "2m",
      exec: "loginTest",
      tags: { endpoint: "login", load: "100" },
    },
    login_150: {
      executor: "constant-vus",
      vus: 150,
      duration: "1m",
      startTime: "3m",
      exec: "loginTest",
      tags: { endpoint: "login", load: "150" },
    },
    login_200: {
      executor: "constant-vus",
      vus: 200,
      duration: "1m",
      startTime: "4m",
      exec: "loginTest",
      tags: { endpoint: "login", load: "200" },
    },
  },
  thresholds: {
    // p75 Response Time Thresholds (forces tracking per tag)
    "http_req_duration{endpoint:login,load:10}": ["p(75)<1000"],
    "http_req_duration{endpoint:login,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:login,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:login,load:150}": ["p(75)<1000"],
    "http_req_duration{endpoint:login,load:200}": ["p(75)<1000"],

    // Error Rate Thresholds (forces tracking per tag)
    "http_req_failed{endpoint:login,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:login,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:login,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:login,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:login,load:200}": ["rate<0.01"],

    // Request Count Thresholds (forces tracking to calculate RPS later)
    "http_reqs{endpoint:login,load:10}": ["count>=0"],
    "http_reqs{endpoint:login,load:50}": ["count>=0"],
    "http_reqs{endpoint:login,load:100}": ["count>=0"],
    "http_reqs{endpoint:login,load:150}": ["count>=0"],
    "http_reqs{endpoint:login,load:200}": ["count>=0"],
  },
};

export function loginTest() {
  const user = users[(__VU - 1) % users.length];

  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const params = {
    headers: { "Content-Type": "application/json" },
    tags: { endpoint: "login" },
  };

  const res = http.post(`${BASE_URL}/login`, payload, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  loginLatency.add(res.timings.duration);
  loginTTFB.add(res.timings.waiting);
  loginErrorRate.add(res.status !== 200);

  sleep(1);
}

// Generates a custom table at the end of the test run
export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200"];

  let customTable = "\n=========================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate \n";
  customTable += "---------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:login,load:${load}`;

    // Extract metrics based on the threshold tags
    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    // Calculate values (duration is 60s per scenario)
    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)}\n`;
  });
  customTable += "=========================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run authRoute.login.k6.capacity.js