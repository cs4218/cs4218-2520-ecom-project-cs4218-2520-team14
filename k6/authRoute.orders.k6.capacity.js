// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1";
const PASSWORD = "password123";

const users = Array.from({ length: 200 }, (_, i) => ({
  email: `User${i + 1}@test.com`,
  password: PASSWORD,
}));

const ordersLatency = new Trend("orders_latency", true);
const ordersTTFB = new Trend("orders_ttfb", true);
const ordersErrorRate = new Rate("orders_error_rate");

export const options = {
  // Added p(75) to the summary stats
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    orders_10: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "10s" },
        { target: 10, duration: "50s" },
      ],
      exec: "ordersTest",
      tags: { endpoint: "orders", load: "10" },
    },
    orders_50: {
      executor: "ramping-vus",
      startVUs: 10,
      startTime: "1m",
      stages: [
        { target: 50, duration: "10s" },
        { target: 50, duration: "50s" },
      ],
      exec: "ordersTest",
      tags: { endpoint: "orders", load: "50" },
    },
    orders_100: {
      executor: "ramping-vus",
      startVUs: 50,
      startTime: "2m",
      stages: [
        { target: 100, duration: "10s" },
        { target: 100, duration: "50s" },
      ],
      exec: "ordersTest",
      tags: { endpoint: "orders", load: "100" },
    },
    orders_150: {
      executor: "ramping-vus",
      startVUs: 100,
      startTime: "3m",
      stages: [
        { target: 150, duration: "10s" },
        { target: 150, duration: "50s" },
      ],
      exec: "ordersTest",
      tags: { endpoint: "orders", load: "150" },
    },
    orders_200: {
      executor: "ramping-vus",
      startVUs: 150,
      startTime: "4m",
      stages: [
        { target: 200, duration: "10s" },
        { target: 200, duration: "50s" },
      ],
      exec: "ordersTest",
      tags: { endpoint: "orders", load: "200" },
    },
    orders_250: {
      executor: "ramping-vus",
      startVUs: 200,
      startTime: "5m",
      stages: [
        { target: 250, duration: "10s" },
        { target: 250, duration: "50s" },
      ],
      exec: "ordersTest",
      tags: { endpoint: "orders", load: "250" },
    },
  },
  thresholds: {
    // UPDATED: p75 Response Time Thresholds
    "http_req_duration{endpoint:orders,load:10}": ["p(75)<1500"],
    "http_req_duration{endpoint:orders,load:50}": ["p(75)<1500"],
    "http_req_duration{endpoint:orders,load:100}": ["p(75)<1500"],
    "http_req_duration{endpoint:orders,load:150}": ["p(75)<1500"],
    "http_req_duration{endpoint:orders,load:200}": ["p(75)<1500"],
    "http_req_duration{endpoint:orders,load:250}": ["p(75)<1500"],

    "http_req_failed{endpoint:orders,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:orders,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:orders,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:orders,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:orders,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:orders,load:250}": ["rate<0.01"],

    "http_reqs{endpoint:orders,load:10}": ["count>=0"],
    "http_reqs{endpoint:orders,load:50}": ["count>=0"],
    "http_reqs{endpoint:orders,load:100}": ["count>=0"],
    "http_reqs{endpoint:orders,load:150}": ["count>=0"],
    "http_reqs{endpoint:orders,load:200}": ["count>=0"],
    "http_reqs{endpoint:orders,load:250}": ["count>=0"],
  },
};

let vuTokens = {};

export function ordersTest() {
  const user = users[(__VU - 1) % users.length];

  if (!vuTokens[__VU]) {
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify(user),
      { headers: { "Content-Type": "application/json" } }
    );

    if (loginRes.status === 200) {
      vuTokens[__VU] = JSON.parse(loginRes.body).token;
    }
  }

  const params = {
    headers: {
      Authorization: `Bearer ${vuTokens[__VU]}`,
    },
    tags: { endpoint: "orders" },
  };

  const res = http.get(`${BASE_URL}/auth/orders`, params);

  check(res, {
    "orders status is 200": (r) => r.status === 200,
  });

  ordersLatency.add(res.timings.duration);
  ordersTTFB.add(res.timings.waiting);
  ordersErrorRate.add(res.status !== 200);

  sleep(1);
}

export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200", "250"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:orders,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    // UPDATED: Extract p75 instead of p90
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | orders\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run authRoute.orders.k6.capacity.js