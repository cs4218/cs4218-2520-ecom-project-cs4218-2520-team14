// Name: Tan Qin Yong
// Student No: A0253468W

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import exec from "k6/execution";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1";

const paymentReqs = new Counter("payment_reqs");
const paymentLatency = new Trend("payment_latency", true);
const paymentErrorRate = new Rate("payment_error_rate");

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
    // We explicitly target only the payment requests to ignore setup data
    "http_req_duration{type:payment}": ["p(90)<3000"], 
    "http_req_failed{type:payment}": ["rate<0.05"],
  },
};

// --- SETUP PHASE: Runs ONCE before the test starts ---
export function setup() {
  console.log("Preparing 250 fresh users for the test... This will take a few seconds.");
  const tokens = [];
  
  // Create exactly 250 users (Max VUs)
  for (let i = 1; i <= 250; i++) {
    const email = `payer_${i}_stress@ecommerce.test`;
    const password = "password123";

    // Register
    http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      name: `Payer ${i}`,
      email: email,
      password: password,
      phone: "12345678",
      address: "123 Test St",
      answer: "Dog",
      DOB: "2000-01-01" 
    }), { headers: { "Content-Type": "application/json" } });

    // Login
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: email, password: password }),
      { headers: { "Content-Type": "application/json" } }
    );

    if (loginRes.status === 200) {
      tokens.push(loginRes.json().token);
    } else {
      tokens.push(null); // Keep array length accurate even if one fails
    }
  }
  
  console.log("Setup complete! Firing up the stress test...");
  return { tokens }; // Pass the tokens down to the default function
}

// --- STRESS PHASE: Pure Payment logic ---
export default function (data) {
  // VU IDs start at 1, arrays start at 0
  const vuIndex = exec.vu.idInTest - 1; 
  const myToken = data.tokens[vuIndex];

  if (!myToken) {
    console.error(`VU ${exec.vu.idInTest} failed to get a token!`);
    return; // Skip this iteration if setup failed for this VU
  }

  const payload = JSON.stringify({
    nonce: "fake-valid-nonce",
    cart: [
      { _id: "66db427fdb0119d9234b27f1", price: 79.99 },
      { _id: "66db427fdb0119d9234b27f9", price: 14.99 }
    ]
  });

  const res = http.post(`${BASE_URL}/product/braintree/payment`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: myToken, 
    },
    tags: { type: "payment" } 
  });

  check(res, { "Payment status is 200": (r) => r.status === 200 });

  paymentReqs.add(1);
  paymentLatency.add(res.timings.duration);
  paymentErrorRate.add(res.status !== 200);

  sleep(Math.random() * 3 + 2);
}

// --- CUSTOM SUMMARY ---
export function handleSummary(data) {
  const reqs = data.metrics.payment_reqs ? data.metrics.payment_reqs.values.count : 0;
  const rps = (reqs / 600).toFixed(2); 
  const latMetric = data.metrics.payment_latency;
  const errMetric = data.metrics.payment_error_rate;

  const p75 = latMetric && latMetric.values["p(75)"] ? latMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
  const p90 = latMetric && latMetric.values["p(90)"] ? latMetric.values["p(90)"].toFixed(2) + " ms" : "N/A";
  const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

  let customTable = "\n=========================================================================\n";
  customTable += " Test Type |   Avg RPS   | p75 Response | p90 Response | Error Rate \n";
  customTable += "-------------------------------------------------------------------------\n";
  customTable += ` Payment   | ${rps.padStart(11)} | ${p75.padStart(12)} | ${p90.padStart(12)} | ${err.padStart(10)}\n`;
  customTable += "=========================================================================\n\n";

  return { stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable };
}