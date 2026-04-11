// Name: Tan Qin Yong
// Student No: A0253468W

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

const filterReqs = new Counter("filter_reqs");
const filterLatency = new Trend("filter_latency", true);
const filterErrorRate = new Rate("filter_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  stages: [
    { duration: "1m", target: 30 },  
    { duration: "2m", target: 30 },  
    { duration: "1m", target: 100 }, 
    { duration: "2m", target: 100 }, 
    { duration: "1m", target: 250 }, 
    { duration: "2m", target: 250 }, 
    { duration: "1m", target: 0 },   
  ],
  thresholds: {
    "http_req_duration": ["p(90)<2500"],
    "http_req_failed": ["rate<0.05"],
  },
};

export default function () {
  const categoryIds = ["66db427fdb0119d9234b27ed", "66db427fdb0119d9234b27ef"];
  const payload = JSON.stringify({ checked: categoryIds, radio: [10, 1500] });

  const res = http.post(`${BASE_URL}/product-filters`, payload, {
    headers: { "Content-Type": "application/json" }
  });

  check(res, { "Filter status is 200": (r) => r.status === 200 });
  
  filterReqs.add(1);
  filterLatency.add(res.timings.duration);
  filterErrorRate.add(res.status !== 200);
  sleep(Math.random() * 3 + 2); 
}

export function handleSummary(data) {
  const reqs = data.metrics.filter_reqs ? data.metrics.filter_reqs.values.count : 0;
  const rps = (reqs / 600).toFixed(2); 
  const latMetric = data.metrics.filter_latency;
  const errMetric = data.metrics.filter_error_rate;

  const p75 = latMetric && latMetric.values["p(75)"] ? latMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
  const p90 = latMetric && latMetric.values["p(90)"] ? latMetric.values["p(90)"].toFixed(2) + " ms" : "N/A";
  const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

  let customTable = "\n=========================================================================\n";
  customTable += " Test Type |   Avg RPS   | p75 Response | p90 Response | Error Rate \n";
  customTable += "-------------------------------------------------------------------------\n";
  customTable += ` Filter    | ${rps.padStart(11)} | ${p75.padStart(12)} | ${p90.padStart(12)} | ${err.padStart(10)}\n`;
  customTable += "=========================================================================\n\n";

    return { 
        stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
        
        // save file
        "filter_stress_report.json": JSON.stringify(data, null, 2),
        "filter_stress_summary.txt": textSummary(data, { indent: " ", enableColors: false }) + customTable
  };
}