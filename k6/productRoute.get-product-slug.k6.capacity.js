// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

// Replace these with real product slugs from your seeded database
const slugs = [
  "textbook",
  "laptop",
  "smartphone",
  "novel",
  "the-law-of-contract-in-singapore",
  "nus-tshirt",
];

const getProductLatency = new Trend("get_product_latency", true);
const getProductTTFB = new Trend("get_product_ttfb", true);
const getProductErrorRate = new Rate("get_product_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    get_product_10: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "10s" },
        { target: 10, duration: "50s" },
      ],
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "10" },
    },
    get_product_50: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { target: 50, duration: "10s" },
        { target: 50, duration: "50s" },
      ],
      startTime: "1m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "50" },
    },
    get_product_100: {
      executor: "ramping-vus",
      startVUs: 50,
      stages: [
        { target: 100, duration: "10s" },
        { target: 100, duration: "50s" },
      ],
      startTime: "2m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "100" },
    },
    get_product_150: {
      executor: "ramping-vus",
      startVUs: 100,
      stages: [
        { target: 150, duration: "10s" },
        { target: 150, duration: "50s" },
      ],
      startTime: "3m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "150" },
    },
    get_product_200: {
      executor: "ramping-vus",
      startVUs: 150,
      stages: [
        { target: 200, duration: "10s" },
        { target: 200, duration: "50s" },
      ],
      startTime: "4m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "200" },
    },
    get_product_250: {
      executor: "ramping-vus",
      startVUs: 200,
      stages: [
        { target: 250, duration: "10s" },
        { target: 250, duration: "50s" },
      ],
      startTime: "5m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "250" },
    },
  },
  thresholds: {
    // p75 Response Time Thresholds (< 1000ms)
    "http_req_duration{endpoint:get-product,load:10}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:150}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:200}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:250}": ["p(75)<1000"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:get-product,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:250}": ["rate<0.01"],

    // Request Counters for RPS calculation
    "http_reqs{endpoint:get-product,load:10}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:50}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:100}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:150}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:200}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:250}": ["count>=0"],
  },
};

export function getProductTest() {
  const slug = slugs[(__VU + __ITER) % slugs.length];

  const params = {
    tags: { endpoint: "get-product" },
  };

  const res = http.get(`${BASE_URL}/get-product/${slug}`, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  getProductLatency.add(res.timings.duration);
  getProductTTFB.add(res.timings.waiting);
  getProductErrorRate.add(res.status !== 200);

  sleep(1);
}

export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200", "250"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:get-product,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | get-product\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run productRoute.get-product-slug.k6.capacity.js