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
    get_product_50: {
      executor: "constant-vus",
      vus: 50,
      duration: "1m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "50" },
    },
    get_product_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "1m",
      startTime: "1m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "100" },
    },
    get_product_150: {
      executor: "constant-vus",
      vus: 150,
      duration: "1m",
      startTime: "2m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "150" },
    },
    get_product_200: {
      executor: "constant-vus",
      vus: 200,
      duration: "1m",
      startTime: "3m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "200" },
    },
    get_product_300: {
      executor: "constant-vus",
      vus: 300,
      duration: "1m",
      startTime: "4m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "300" },
    },
    get_product_400: {
      executor: "constant-vus",
      vus: 400,
      duration: "1m",
      startTime: "5m",
      exec: "getProductTest",
      tags: { endpoint: "get-product", load: "400" },
    },
  },
  thresholds: {
    // p75 Response Time Thresholds (< 1000ms)
    "http_req_duration{endpoint:get-product,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:150}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:200}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:300}": ["p(75)<1000"],
    "http_req_duration{endpoint:get-product,load:400}": ["p(75)<1000"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:get-product,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:300}": ["rate<0.01"],
    "http_req_failed{endpoint:get-product,load:400}": ["rate<0.01"],

    // Request Counters for RPS calculation
    "http_reqs{endpoint:get-product,load:50}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:100}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:150}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:200}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:300}": ["count>=0"],
    "http_reqs{endpoint:get-product,load:400}": ["count>=0"],
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
  const loads = ["50", "100", "150", "200", "300", "400"];

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