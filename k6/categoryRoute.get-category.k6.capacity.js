// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/category";

const categoryLatency = new Trend("category_latency", true);
const categoryTTFB = new Trend("category_ttfb", true);
const categoryErrorRate = new Rate("category_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    category_10: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "10s" },
        { target: 10, duration: "50s" },
      ],
      exec: "categoryTest",
      tags: { endpoint: "get-category", load: "10" },
    },
    category_50: {
      executor: "ramping-vus",
      startVUs: 10,
      startTime: "1m",
      stages: [
        { target: 50, duration: "10s" },
        { target: 50, duration: "50s" },
      ],
      exec: "categoryTest",
      tags: { endpoint: "get-category", load: "50" },
    },
    category_100: {
      executor: "ramping-vus",
      startVUs: 50,
      startTime: "2m",
      stages: [
        { target: 100, duration: "10s" },
        { target: 100, duration: "50s" },
      ],
      exec: "categoryTest",
      tags: { endpoint: "get-category", load: "100" },
    },
    category_150: {
      executor: "ramping-vus",
      startVUs: 100,
      startTime: "3m",
      stages: [
        { target: 150, duration: "10s" },
        { target: 150, duration: "50s" },
      ],
      exec: "categoryTest",
      tags: { endpoint: "get-category", load: "150" },
    },
    category_200: {
      executor: "ramping-vus",
      startVUs: 150,
      startTime: "4m",
      stages: [
        { target: 200, duration: "10s" },
        { target: 200, duration: "50s" },
      ],
      exec: "categoryTest",
      tags: { endpoint: "get-category", load: "200" },
    },
    category_250: {
      executor: "ramping-vus",
      startVUs: 200,
      startTime: "5m",
      stages: [
        { target: 250, duration: "10s" },
        { target: 250, duration: "50s" },
      ],
      exec: "categoryTest",
      tags: { endpoint: "get-category", load: "250" },
    },
  },
  thresholds: {
    // p75 Response Time Thresholds
    "http_req_duration{endpoint:get-category,load:10}": ["p(75)<500"],
    "http_req_duration{endpoint:get-category,load:50}": ["p(75)<500"],
    "http_req_duration{endpoint:get-category,load:100}": ["p(75)<500"],
    "http_req_duration{endpoint:get-category,load:150}": ["p(75)<500"],
    "http_req_duration{endpoint:get-category,load:200}": ["p(75)<500"],
    "http_req_duration{endpoint:get-category,load:250}": ["p(75)<500"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:get-category,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:get-category,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:get-category,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:get-category,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:get-category,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:get-category,load:250}": ["rate<0.01"],

    // Request Counter Tracking (Required for RPS in handleSummary)
    "http_reqs{endpoint:get-category,load:10}": ["count>=0"],
    "http_reqs{endpoint:get-category,load:50}": ["count>=0"],
    "http_reqs{endpoint:get-category,load:100}": ["count>=0"],
    "http_reqs{endpoint:get-category,load:150}": ["count>=0"],
    "http_reqs{endpoint:get-category,load:200}": ["count>=0"],
    "http_reqs{endpoint:get-category,load:250}": ["count>=0"],
  },
};

export function categoryTest() {
  const params = {
    tags: { endpoint: "get-category" },
  };

  const res = http.get(`${BASE_URL}/get-category`, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  categoryLatency.add(res.timings.duration);
  categoryTTFB.add(res.timings.waiting);
  categoryErrorRate.add(res.status !== 200);

  sleep(1);
}

// Generates the custom table and full summary aligned to p75
export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200", "250"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:get-category,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | get-category\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run categoryRoute.get-category.k6.capacity.js