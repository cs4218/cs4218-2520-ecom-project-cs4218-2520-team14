// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

// Keywords for diverse query testing
const keywords = ["textbook", "laptop", "smartphone", "novel", "law", "tshirt"];

const searchLatency = new Trend("product_search_latency", true);
const searchTTFB = new Trend("product_search_ttfb", true);
const searchErrorRate = new Rate("product_search_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    search_10: {
      executor: "constant-vus",
      vus: 10,
      duration: "1m",
      exec: "searchTest",
      tags: { endpoint: "search-product", load: "10" },
    },
    search_25: {
      executor: "constant-vus",
      vus: 25,
      duration: "1m",
      startTime: "1m",
      exec: "searchTest",
      tags: { endpoint: "search-product", load: "25" },
    },
    search_50: {
      executor: "constant-vus",
      vus: 50,
      duration: "1m",
      startTime: "2m",
      exec: "searchTest",
      tags: { endpoint: "search-product", load: "50" },
    },
    search_75: {
      executor: "constant-vus",
      vus: 75,
      duration: "1m",
      startTime: "3m",
      exec: "searchTest",
      tags: { endpoint: "search-product", load: "75" },
    },
    search_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "1m",
      startTime: "4m",
      exec: "searchTest",
      tags: { endpoint: "search-product", load: "100" },
    },
    search_150: {
      executor: "constant-vus",
      vus: 150,
      duration: "1m",
      startTime: "5m",
      exec: "searchTest",
      tags: { endpoint: "search-product", load: "150" },
    },
  },
  thresholds: {
    // UPDATED: p75 Response Time Thresholds (< 1000ms)
    "http_req_duration{endpoint:search-product,load:10}": ["p(75)<1000"],
    "http_req_duration{endpoint:search-product,load:25}": ["p(75)<1000"],
    "http_req_duration{endpoint:search-product,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:search-product,load:75}": ["p(75)<1000"],
    "http_req_duration{endpoint:search-product,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:search-product,load:150}": ["p(75)<1000"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:search-product,load:10}": ["rate<0.01"],
    "http_req_failed{endpoint:search-product,load:25}": ["rate<0.01"],
    "http_req_failed{endpoint:search-product,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:search-product,load:75}": ["rate<0.01"],
    "http_req_failed{endpoint:search-product,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:search-product,load:150}": ["rate<0.01"],

    // Request Counters (for RPS calculation in handleSummary)
    "http_reqs{endpoint:search-product,load:10}": ["count>=0"],
    "http_reqs{endpoint:search-product,load:25}": ["count>=0"],
    "http_reqs{endpoint:search-product,load:50}": ["count>=0"],
    "http_reqs{endpoint:search-product,load:75}": ["count>=0"],
    "http_reqs{endpoint:search-product,load:100}": ["count>=0"],
    "http_reqs{endpoint:search-product,load:150}": ["count>=0"],
  },
};

export function searchTest() {
  const keyword = keywords[(__VU + __ITER) % keywords.length];

  const params = {
    tags: { endpoint: "search-product" },
  };

  const res = http.get(`${BASE_URL}/search/${encodeURIComponent(keyword)}`, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  searchLatency.add(res.timings.duration);
  searchTTFB.add(res.timings.waiting);
  searchErrorRate.add(res.status !== 200);

  sleep(1);
}

// Custom Summary Table aligned to p75
export function handleSummary(data) {
  const loads = ["10", "25", "50", "75", "100", "150"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:search-product,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | search-product\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run productRoute.search.k6.capacity.js