// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/auth";

const registerLatency = new Trend("register_latency", true);
const registerTTFB = new Trend("register_ttfb", true);
const registerErrorRate = new Rate("register_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    register_10: {
      executor: "constant-vus",
      vus: 10,
      duration: "1m",
      exec: "registerTest",
      tags: { endpoint: "register", load: "10" },
    },
    register_50: {
      executor: "constant-vus",
      vus: 50,
      duration: "1m",
      startTime: "1m",
      exec: "registerTest",
      tags: { endpoint: "register", load: "50" },
    },
    register_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "1m",
      startTime: "2m",
      exec: "registerTest",
      tags: { endpoint: "register", load: "100" },
    },
    register_150: {
      executor: "constant-vus",
      vus: 150,
      duration: "1m",
      startTime: "3m",
      exec: "registerTest",
      tags: { endpoint: "register", load: "150" },
    },
    register_200: {
      executor: "constant-vus",
      vus: 200,
      duration: "1m",
      startTime: "4m",
      exec: "registerTest",
      tags: { endpoint: "register", load: "200" },
    },
  },
  thresholds: {
    // UPDATED: p75 Response Time Thresholds (< 1000ms)
    "http_req_duration{endpoint:register,load:10}": ["p(75)<1000"],
    "http_req_duration{endpoint:register,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:register,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:register,load:150}": ["p(75)<1000"],
    "http_req_duration{endpoint:register,load:200}": ["p(75)<1000"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:register,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:register,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:register,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:register,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:register,load:200}": ["rate<0.01"],

    // Request Counters (Required for RPS calculation in handleSummary)
    "http_reqs{endpoint:register,load:10}": ["count>=0"],
    "http_reqs{endpoint:register,load:50}": ["count>=0"],
    "http_reqs{endpoint:register,load:100}": ["count>=0"],
    "http_reqs{endpoint:register,load:150}": ["count>=0"],
    "http_reqs{endpoint:register,load:200}": ["count>=0"],
  },
};

export function registerTest() {
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    name: `Test User ${uniqueId}`,
    email: `register_user_${uniqueId}@test.com`,
    password: "password123",
    phone: `9000${String(__VU).padStart(4, "0")}`,
    address: `Test Address ${uniqueId}`,
    answer: "blue",
  });

  const params = {
    headers: { "Content-Type": "application/json" },
    tags: { endpoint: "register" },
  };

  const res = http.post(`${BASE_URL}/register`, payload, params);

  check(res, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
  });

  registerLatency.add(res.timings.duration);
  registerTTFB.add(res.timings.waiting);
  registerErrorRate.add(!(res.status === 200 || res.status === 201));

  sleep(1);
}

// Custom Summary Table aligned to p75 for D4.1 Reporting
export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:register,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | register\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run authRoute.register.k6.capacity.js