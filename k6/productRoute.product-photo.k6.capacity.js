// Chia York Lim, A0258147X
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

const pids = [
  "66db427fdb0119d9234b27f1",
  "66db427fdb0119d9234b27f3",
  "66db427fdb0119d9234b27f5",
  "66db427fdb0119d9234b27f9",
  "67a2171ea6d9e00ef2ac0229",
  "67a21772a6d9e00ef2ac022a",
];

const photoLatency = new Trend("product_photo_latency", true);
const photoTTFB = new Trend("product_photo_ttfb", true);
const photoErrorRate = new Rate("product_photo_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    photo_50: {
      executor: "constant-vus",
      vus: 50,
      duration: "1m",
      startTime: "1m",
      exec: "photoTest",
      tags: { endpoint: "product-photo", load: "50" },
    },
    photo_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "1m",
      startTime: "2m",
      exec: "photoTest",
      tags: { endpoint: "product-photo", load: "100" },
    },
    photo_150: {
      executor: "constant-vus",
      vus: 150,
      duration: "1m",
      startTime: "3m",
      exec: "photoTest",
      tags: { endpoint: "product-photo", load: "150" },
    },
    photo_200: {
      executor: "constant-vus",
      vus: 200,
      duration: "1m",
      startTime: "4m",
      exec: "photoTest",
      tags: { endpoint: "product-photo", load: "200" },
    },
    photo_300: {
      executor: "constant-vus",
      vus: 300,
      duration: "1m",
      startTime: "5m",
      exec: "photoTest",
      tags: { endpoint: "product-photo", load: "300" },
    },
    photo_400: {
      executor: "constant-vus",
      vus: 400,
      duration: "1m",
      startTime: "6m",
      exec: "photoTest",
      tags: { endpoint: "product-photo", load: "400" },
    },
  },
  thresholds: {
    // UPDATED: p75 Response Time Thresholds (< 1000ms)
    "http_req_duration{endpoint:product-photo,load:50}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-photo,load:100}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-photo,load:150}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-photo,load:200}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-photo,load:300}": ["p(75)<1000"],
    "http_req_duration{endpoint:product-photo,load:400}": ["p(75)<1000"],

    // Error Rate Thresholds
    "http_req_failed{endpoint:product-photo,load:50}": ["rate<0.01"],
    "http_req_failed{endpoint:product-photo,load:100}": ["rate<0.01"],
    "http_req_failed{endpoint:product-photo,load:150}": ["rate<0.01"],
    "http_req_failed{endpoint:product-photo,load:200}": ["rate<0.01"],
    "http_req_failed{endpoint:product-photo,load:300}": ["rate<0.01"],
    "http_req_failed{endpoint:product-photo,load:400}": ["rate<0.01"],

    // Request Counter Tracking for Summary
    "http_reqs{endpoint:product-photo,load:50}": ["count>=0"],
    "http_reqs{endpoint:product-photo,load:100}": ["count>=0"],
    "http_reqs{endpoint:product-photo,load:150}": ["count>=0"],
    "http_reqs{endpoint:product-photo,load:200}": ["count>=0"],
    "http_reqs{endpoint:product-photo,load:300}": ["count>=0"],
    "http_reqs{endpoint:product-photo,load:400}": ["count>=0"],
  },
};

export function photoTest() {
  const pid = pids[(__VU + __ITER) % pids.length];

  const params = {
    tags: { endpoint: "product-photo" },
  };

  const res = http.get(`${BASE_URL}/product-photo/${pid}`, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "content-type is image": (r) =>
      r.headers["Content-Type"] &&
      r.headers["Content-Type"].includes("image"),
  });

  photoLatency.add(res.timings.duration);
  photoTTFB.add(res.timings.waiting);
  photoErrorRate.add(res.status !== 200);

  sleep(1);
}

// Custom Summary Table for p75 Reporting
export function handleSummary(data) {
  const loads = ["50", "100", "150", "200", "300", "400"];

  let customTable = "\n=========================================================================\n";
  customTable += " VU Load |    RPS    | p75 Response Time | Error Rate |   Endpoints   \n";
  customTable += "-------------------------------------------------------------------------\n";

  loads.forEach((load) => {
    const tag = `endpoint:product-photo,load:${load}`;

    const reqsMetric = data.metrics[`http_reqs{${tag}}`];
    const rtMetric = data.metrics[`http_req_duration{${tag}}`];
    const errMetric = data.metrics[`http_req_failed{${tag}}`];

    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 60).toFixed(2);
    const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

    customTable += ` ${load.padStart(7)} | ${rps.padStart(9)} | ${p75.padStart(17)} | ${err.padStart(10)} | product-photo\n`;
  });
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}

// k6 run productRoute.product-photo.k6.capacity.js