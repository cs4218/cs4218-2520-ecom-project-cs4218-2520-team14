// Name: Tan Qin Yong
// Student No: A0253468W

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

const searchReqs = new Counter("search_reqs");
const searchLatency = new Trend("search_latency", true);
const searchErrorRate = new Rate("search_error_rate");

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
  const keywords = ["Textbook", "Laptop", "Smartphone", "Novel", "comprehensive", "powerful", "bestselling"];
  const searchKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  const res = http.get(`${BASE_URL}/search/${searchKeyword}`);
  
  check(res, { "Search status is 200": (r) => r.status === 200 });
  
  searchReqs.add(1);
  searchLatency.add(res.timings.duration);
  searchErrorRate.add(res.status !== 200);
  sleep(Math.random() * 3 + 2); 
}

export function handleSummary(data) {
  const reqs = data.metrics.search_reqs ? data.metrics.search_reqs.values.count : 0;
  const rps = (reqs / 600).toFixed(2); 
  const latMetric = data.metrics.search_latency;
  const errMetric = data.metrics.search_error_rate;

  const p75 = latMetric && latMetric.values["p(75)"] ? latMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
  const p90 = latMetric && latMetric.values["p(90)"] ? latMetric.values["p(90)"].toFixed(2) + " ms" : "N/A";
  const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

  let customTable = "\n=========================================================================\n";
  customTable += " Test Type |   Avg RPS   | p75 Response | p90 Response | Error Rate \n";
  customTable += "-------------------------------------------------------------------------\n";
  customTable += ` Search    | ${rps.padStart(11)} | ${p75.padStart(12)} | ${p90.padStart(12)} | ${err.padStart(10)}\n`;
  customTable += "=========================================================================\n\n";

  return { stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable };
}