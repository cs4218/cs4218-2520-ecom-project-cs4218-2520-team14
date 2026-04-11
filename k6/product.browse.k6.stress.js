// Name: Tan Qin Yong
// Student No: A0253468W

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

const browseReqs = new Counter("browse_reqs");
const browseLatency = new Trend("browse_latency", true);
const browseErrorRate = new Rate("browse_error_rate");

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
    "http_req_duration": ["p(90)<2000"],
    "http_req_failed": ["rate<0.05"],
  },
};

export default function () {
  const randomPage = Math.floor(Math.random() * 2) + 1; 
  const res = http.get(`${BASE_URL}/product-list/${randomPage}`);
  
  check(res, { "Browse status is 200": (r) => r.status === 200 });
  
  browseReqs.add(1);
  browseLatency.add(res.timings.duration);
  browseErrorRate.add(res.status !== 200);
  sleep(Math.random() * 3 + 2); 
}

export function handleSummary(data) {
  const reqs = data.metrics.browse_reqs ? data.metrics.browse_reqs.values.count : 0;
  const rps = (reqs / 600).toFixed(2); 
  const latMetric = data.metrics.browse_latency;
  const errMetric = data.metrics.browse_error_rate;

  const p75 = latMetric && latMetric.values["p(75)"] ? latMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
  const p90 = latMetric && latMetric.values["p(90)"] ? latMetric.values["p(90)"].toFixed(2) + " ms" : "N/A";
  const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

  let customTable = "\n=========================================================================\n";
  customTable += " Test Type |   Avg RPS   | p75 Response | p90 Response | Error Rate \n";
  customTable += "-------------------------------------------------------------------------\n";
  customTable += ` Browse    | ${rps.padStart(11)} | ${p75.padStart(12)} | ${p90.padStart(12)} | ${err.padStart(10)}\n`;
  customTable += "=========================================================================\n\n";

  return { 
      stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
      
      // save file
      "browse_stress_report.json": JSON.stringify(data, null, 2),
      "browse_stress_summary.txt": textSummary(data, { indent: " ", enableColors: false }) + customTable
  };
}