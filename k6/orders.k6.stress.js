// Name: Tan Qin Yong
// Student No: A0253468W

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import exec from "k6/execution";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1";

const ordersReqs = new Counter("orders_reqs");
const ordersLatency = new Trend("orders_latency", true);
const ordersErrorRate = new Rate("orders_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  stages: [
    { duration: "1m", target: 30 },
    { duration: "2m", target: 30 },
    { duration: "1m", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "1m", target: 250 },
    { duration: "2m", target: 250 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    // Pure thresholds for the orders endpoint
    "http_req_duration{type:orders}": ["p(90)<2000"],
    "http_req_failed{type:orders}": ["rate<0.05"],
  },
};

// --- SETUP PHASE: Log into the accounts created by the Payment test ---
export function setup() {
  console.log("Fetching tokens for 250 users... Make sure you ran the Payment test first!");
  const tokens = [];

  for (let i = 1; i <= 250; i++) {
    // Using the exact predictable email from the updated payment test
    const email = `payer_${i}_stress@ecommerce.test`;
    const password = "password123";

    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: email, password: password }),
      { headers: { "Content-Type": "application/json" } }
    );

    if (loginRes.status === 200) {
      tokens.push(loginRes.json().token);
    } else {
      tokens.push(null); 
    }
  }

  console.log("Tokens fetched! Starting Orders stress test...");
  return { tokens }; 
}

// --- STRESS PHASE: Pure Orders logic ---
export default function (data) {
  const vuIndex = exec.vu.idInTest - 1; 
  const myToken = data.tokens[vuIndex];

  if (!myToken) {
    console.error(`VU ${exec.vu.idInTest} missing token! The user probably wasn't created by the Payment test.`);
    return; // Skip if no token
  }

  const res = http.get(`${BASE_URL}/auth/orders`, {
    headers: { Authorization: myToken },
    tags: { type: "orders" } // Tagged for threshold purity
  });

  check(res, { "Orders status is 200": (r) => r.status === 200 });

  ordersReqs.add(1);
  ordersLatency.add(res.timings.duration);
  ordersErrorRate.add(res.status !== 200);

  sleep(Math.random() * 3 + 2);
}

// --- CUSTOM SUMMARY ---
export function handleSummary(data) {
  const reqs = data.metrics.orders_reqs ? data.metrics.orders_reqs.values.count : 0;
  const rps = (reqs / 600).toFixed(2); 
  const latMetric = data.metrics.orders_latency;
  const errMetric = data.metrics.orders_error_rate;

  const p75 = latMetric && latMetric.values["p(75)"] ? latMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
  const p90 = latMetric && latMetric.values["p(90)"] ? latMetric.values["p(90)"].toFixed(2) + " ms" : "N/A";
  const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

  let customTable = "\n=========================================================================\n";
  customTable += " Test Type |   Avg RPS   | p75 Response | p90 Response | Error Rate \n";
  customTable += "-------------------------------------------------------------------------\n";
  customTable += ` Orders    | ${rps.padStart(11)} | ${p75.padStart(12)} | ${p90.padStart(12)} | ${err.padStart(10)}\n`;
  customTable += "=========================================================================\n\n";

  return { stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable };
}