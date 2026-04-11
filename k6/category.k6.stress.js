// Name: Tan Qin Yong
// Student No: A0253468W

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/category";

// Custom Metrics
const categoryReqs = new Counter("category_reqs");
const categoryLatency = new Trend("category_latency", true);
const categoryErrorRate = new Rate("category_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  stages: [
    { duration: "1m", target: 30 },  // Warm up
    { duration: "2m", target: 30 },  // Average Load
    { duration: "1m", target: 100 }, // Ramp to Degradation Point
    { duration: "2m", target: 100 }, // Sustained Degradation
    { duration: "1m", target: 250 }, // Ramp to Breaking Point
    { duration: "2m", target: 250 }, // Sustained Extreme
    { duration: "1m", target: 0 },   // Cool down
  ],
  thresholds: {
    // Categories should be very fast (simple fetch all)
    "http_req_duration": ["p(90)<1000"], 
    "http_req_failed": ["rate<0.01"], 
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/get-category`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "has categories": (r) => r.json().category && r.json().category.length > 0,
  });

  categoryReqs.add(1);
  categoryLatency.add(res.timings.duration);
  categoryErrorRate.add(res.status !== 200);

  // Users usually load the menu once and then look at it for a few seconds
  sleep(Math.random() * 3 + 2); 
}

export function handleSummary(data) {
  const reqsMetric = data.metrics.category_reqs;
  const latMetric = data.metrics.category_latency;
  const errMetric = data.metrics.category_error_rate;

  const reqs = reqsMetric ? reqsMetric.values.count : 0;
  const rps = (reqs / 600).toFixed(2); // 10 minute test duration
  const p75 = latMetric && latMetric.values["p(75)"] ? latMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
  const p90 = latMetric && latMetric.values["p(90)"] ? latMetric.values["p(90)"].toFixed(2) + " ms" : "N/A";
  const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

  let customTable = "\n=========================================================================\n";
  customTable += " Test Type |   Avg RPS   | p75 Response | p90 Response | Error Rate \n";
  customTable += "-------------------------------------------------------------------------\n";
  customTable += ` Categories| ${rps.padStart(11)} | ${p75.padStart(12)} | ${p90.padStart(12)} | ${err.padStart(10)}\n`;
  customTable += "=========================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}