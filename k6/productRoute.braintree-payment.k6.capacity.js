// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1";
const PASSWORD = "password123";

const users = Array.from({ length: 50 }, (_, i) => ({
  email: `User${i + 1}@test.com`,
  password: PASSWORD,
}));

const cartTemplates = [
  [{ _id: "66db427fdb0119d9234b27f1", price: 79.99 }],
  [{ _id: "66db427fdb0119d9234b27f9", price: 14.99 }, { _id: "66db427fdb0119d9234b27f1", price: 79.99 }],
  [{ _id: "66db427fdb0119d9234b27f9", price: 14.99 }],
];

const paymentLatency = new Trend("payment_latency", true);
const paymentTTFB = new Trend("payment_ttfb", true);
const paymentErrorRate = new Rate("payment_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    payment_10: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "10s" },
        { target: 10, duration: "50s" },
      ],
      exec: "paymentTest",
      tags: { endpoint: "braintree-payment", load: "10" },
    },
    payment_50: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { target: 50, duration: "10s" },
        { target: 50, duration: "50s" },
      ],
      startTime: "1m",
      exec: "paymentTest",
      tags: { endpoint: "braintree-payment", load: "50" },
    },
    payment_100: {
      executor: "ramping-vus",
      startVUs: 50,
      stages: [
        { target: 100, duration: "10s" },
        { target: 100, duration: "50s" },
      ],
      startTime: "2m",
      exec: "paymentTest",
      tags: { endpoint: "braintree-payment", load: "100" },
    },
    payment_150: {
      executor: "ramping-vus",
      startVUs: 100,
      stages: [
        { target: 150, duration: "10s" },
        { target: 150, duration: "50s" },
      ],
      startTime: "3m",
      exec: "paymentTest",
      tags: { endpoint: "braintree-payment", load: "150" },
    },
    payment_200: {
      executor: "ramping-vus",
      startVUs: 150,
      stages: [
        { target: 200, duration: "10s" },
        { target: 200, duration: "50s" },
      ],
      startTime: "4m",
      exec: "paymentTest",
      tags: { endpoint: "braintree-payment", load: "200" },
    },
    payment_250: {
      executor: "ramping-vus",
      startVUs: 200,
      stages: [
        { target: 250, duration: "10s" },
        { target: 250, duration: "50s" },
      ],
      startTime: "5m",
      exec: "paymentTest",
      tags: { endpoint: "braintree-payment", load: "250" },
    },
  },
  thresholds: {
    // p75 Response Time Thresholds (< 750ms)
    "http_req_duration{endpoint:braintree-payment,load:10}": ["p(75)<750"],
    "http_req_duration{endpoint:braintree-payment,load:50}": ["p(75)<750"],
    "http_req_duration{endpoint:braintree-payment,load:100}": ["p(75)<750"],
    "http_req_duration{endpoint:braintree-payment,load:150}": ["p(75)<750"],
    "http_req_duration{endpoint:braintree-payment,load:200}": ["p(75)<750"],
    "http_req_duration{endpoint:braintree-payment,load:250}": ["p(75)<750"],

    "http_req_failed{endpoint:braintree-payment,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:braintree-payment,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:braintree-payment,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:braintree-payment,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:braintree-payment,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:braintree-payment,load:250}": ["rate<0.01"],

    "http_reqs{endpoint:braintree-payment,load:10}": ["count>=0"],
    "http_reqs{endpoint:braintree-payment,load:50}": ["count>=0"],
    "http_reqs{endpoint:braintree-payment,load:100}": ["count>=0"],
    "http_reqs{endpoint:braintree-payment,load:150}": ["count>=0"],
    "http_reqs{endpoint:braintree-payment,load:200}": ["count>=0"],
    "http_reqs{endpoint:braintree-payment,load:250}": ["count>=0"],
  },
};

let vuTokens = {};

export function paymentTest() {
  const user = users[(__VU - 1) % users.length];
  const cart = cartTemplates[(__VU + __ITER) % cartTemplates.length];

  // 1. Authenticate once per VU
  if (!vuTokens[__VU]) {
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: { "Content-Type": "application/json" } }
    );
    if (loginRes.status === 200) {
      vuTokens[__VU] = JSON.parse(loginRes.body).token;
    }
  }

  const payload = JSON.stringify({
    nonce: "fake-valid-nonce",
    cart,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${vuTokens[__VU]}`,
    },
    tags: { endpoint: "braintree-payment" },
  };

  // 2. Perform the Payment Request
  const res = http.post(`${BASE_URL}/product/braintree/payment`, payload, params);

  check(res, {
    "payment status is 200": (r) => r.status === 200,
  });

  // Track metrics specifically for payment execution
  paymentLatency.add(res.timings.duration);
  paymentTTFB.add(res.timings.waiting);
  paymentErrorRate.add(res.status !== 200);

  sleep(1);
}

export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200", "250"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:braintree-payment,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | braintree-payment\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run productRoute.braintree-payment.k6.capacity.js