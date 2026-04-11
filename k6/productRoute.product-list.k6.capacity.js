// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

const productListLatency = new Trend("product_list_latency", true);
const productListTTFB = new Trend("product_list_ttfb", true);
const productListErrorRate = new Rate("product_list_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    product_list_10: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "10s" },
        { target: 10, duration: "50s" },
      ],
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "10" },
    },
    product_list_50: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { target: 50, duration: "10s" },
        { target: 50, duration: "50s" },
      ],
      startTime: "1m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "50" },
    },
    product_list_100: {
      executor: "ramping-vus",
      startVUs: 50,
      stages: [
        { target: 100, duration: "10s" },
        { target: 100, duration: "50s" },
      ],
      startTime: "2m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "100" },
    },
    product_list_150: {
      executor: "ramping-vus",
      startVUs: 100,
      stages: [
        { target: 150, duration: "10s" },
        { target: 150, duration: "50s" },
      ],
      startTime: "3m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "150" },
    },
    product_list_200: {
      executor: "ramping-vus",
      startVUs: 150,
      stages: [
        { target: 200, duration: "10s" },
        { target: 200, duration: "50s" },
      ],
      startTime: "4m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "200" },
    },
    product_list_250: {
      executor: "ramping-vus",
      startVUs: 200,
      stages: [
        { target: 250, duration: "10s" },
        { target: 250, duration: "50s" },
      ],
      startTime: "5m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "250" },
    }
  },
  thresholds: {
    // UPDATED: p75 Response Time Thresholds (< 1000ms)
    "http_req_duration{endpoint:product-list,load:10}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:150}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:200}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:250}": ["p(75)<1000"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:product-list,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:250}": ["rate<0.01"],

    // Request Counters for RPS
    "http_reqs{endpoint:product-list,load:10}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:50}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:100}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:150}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:200}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:250}": ["count>=0"],
  },
};

export function productListTest() {
  const params = {
    tags: { endpoint: "product-list" },
  };

  const res = http.get(`${BASE_URL}/product-list/1`, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  productListLatency.add(res.timings.duration);
  productListTTFB.add(res.timings.waiting);
  productListErrorRate.add(res.status !== 200);

  sleep(1);
}

// Custom Summary Table for p75 Reporting
export function handleSummary(data) {
  const loads = ["10", "50", "100", "150", "200", "250"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:product-list,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | product-list\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run productRoute.product-list.k6.capacity.js