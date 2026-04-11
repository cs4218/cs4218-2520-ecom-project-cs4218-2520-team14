// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

const categoryIds = [
  "66db427fdb0119d9234b27ed",
  "66db427fdb0119d9234b27ef",
  "66db427fdb0119d9234b27ee",
];

// Sample filter combinations
const filterPayloads = [
  { checked: [categoryIds[0]], radio: [] },
  { checked: [categoryIds[1]], radio: [] },
  { checked: [categoryIds[0], categoryIds[1]], radio: [] },
  { checked: [], radio: [0, 50] },
  { checked: [], radio: [50, 100] },
  { checked: [categoryIds[0]], radio: [0, 50] },
  { checked: [categoryIds[1]], radio: [50, 100] },
  { checked: [categoryIds[2]], radio: [100, 500] },
  { checked: [categoryIds[0], categoryIds[2]], radio: [0, 500] },
];

const filterLatency = new Trend("product_filter_latency", true);
const filterTTFB = new Trend("product_filter_ttfb", true);
const filterErrorRate = new Rate("product_filter_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    filter_10: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "10s" },
        { target: 10, duration: "50s" },
      ],
      exec: "filterTest",
      tags: { endpoint: "product-filters", load: "10" },
    },
    filter_50: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { target: 50, duration: "10s" },
        { target: 50, duration: "50s" },
      ],
      startTime: "1m",
      exec: "filterTest",
      tags: { endpoint: "product-filters", load: "50" },
    },
    filter_100: {
      executor: "ramping-vus",
      startVUs: 50,
      stages: [
        { target: 100, duration: "10s" },
        { target: 100, duration: "50s" },
      ],
      startTime: "2m",
      exec: "filterTest",
      tags: { endpoint: "product-filters", load: "100" },
    },
    filter_150: {
      executor: "ramping-vus",
      startVUs: 100,
      stages: [
        { target: 150, duration: "10s" },
        { target: 150, duration: "50s" },
      ],
      startTime: "3m",
      exec: "filterTest",
      tags: { endpoint: "product-filters", load: "150" },
    },
    filter_200: {
      executor: "ramping-vus",
      startVUs: 150,
      stages: [
        { target: 200, duration: "10s" },
        { target: 200, duration: "50s" },
      ],
      startTime: "4m",
      exec: "filterTest",
      tags: { endpoint: "product-filters", load: "200" },
    },
    filter_250: {
      executor: "ramping-vus",
      startVUs: 200,
      stages: [
        { target: 250, duration: "10s" },
        { target: 250, duration: "50s" },
      ],
      startTime: "5m",
      exec: "filterTest",
      tags: { endpoint: "product-filters", load: "250" },
    },
  },
  thresholds: {
    // UPDATED: p75 Response Time Thresholds (< 500ms)
    "http_req_duration{endpoint:product-filters,load:10}": ["p(75)<500"],
    "http_req_duration{endpoint:product-filters,load:50}": ["p(75)<500"],
    "http_req_duration{endpoint:product-filters,load:100}": ["p(75)<500"],
    "http_req_duration{endpoint:product-filters,load:150}": ["p(75)<500"],
    "http_req_duration{endpoint:product-filters,load:200}": ["p(75)<500"],
    "http_req_duration{endpoint:product-filters,load:250}": ["p(75)<500"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:product-filters,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:product-filters,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:product-filters,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:product-filters,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:product-filters,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:product-filters,load:250}": ["rate<0.01"],

    // Request Counters (Required for RPS calculation in handleSummary)
    "http_reqs{endpoint:product-filters,load:10}": ["count>=0"],
    "http_reqs{endpoint:product-filters,load:50}": ["count>=0"],
    "http_reqs{endpoint:product-filters,load:100}": ["count>=0"],
    "http_reqs{endpoint:product-filters,load:150}": ["count>=0"],
    "http_reqs{endpoint:product-filters,load:200}": ["count>=0"],
    "http_reqs{endpoint:product-filters,load:250}": ["count>=0"],
  },
};

export function filterTest() {
  const payloadData = filterPayloads[(__VU + __ITER) % filterPayloads.length];

  const payload = JSON.stringify({
    checked: payloadData.checked,
    radio: payloadData.radio,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    tags: { endpoint: "product-filters" },
  };

  const res = http.post(`${BASE_URL}/product-filters`, payload, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  filterLatency.add(res.timings.duration);
  filterTTFB.add(res.timings.waiting);
  filterErrorRate.add(res.status !== 200);

  sleep(1);
}

// Custom Summary Table aligned to p75
export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200", "250"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:product-filters,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | product-filters\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run productRoute.product-filters.k6.capacity.js