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
    product_list_50: {
      executor: "constant-vus",
      vus: 50,
      duration: "1m",
      startTime: "1m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "50" },
    },
    product_list_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "1m",
      startTime: "2m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "100" },
    },
    product_list_150: {
      executor: "constant-vus",
      vus: 150,
      duration: "1m",
      startTime: "3m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "150" },
    },
    product_list_200: {
      executor: "constant-vus",
      vus: 200,
      duration: "1m",
      startTime: "4m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "200" },
    },
    product_list_300: {
      executor: "constant-vus",
      vus: 300,
      duration: "1m",
      startTime: "5m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "300" },
    },
    product_list_400: {
      executor: "constant-vus",
      vus: 400,
      duration: "1m",
      startTime: "6m",
      exec: "productListTest",
      tags: { endpoint: "product-list", load: "400" },
    }
  },
  thresholds: {
    // UPDATED: p75 Response Time Thresholds (< 1000ms)
    "http_req_duration{endpoint:product-list,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:150}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:200}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:300}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-list,load:400}": ["p(75)<1000"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:product-list,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:300}": ["rate<0.01"],
    "http_req_failed{endpoint:product-list,load:400}": ["rate<0.01"],

    // Request Counters for RPS
    "http_reqs{endpoint:product-list,load:50}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:100}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:150}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:200}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:300}": ["count>=0"],
    "http_reqs{endpoint:product-list,load:400}": ["count>=0"],
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
  const loads = ["50", "100", "150", "200", "300", "400"];

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