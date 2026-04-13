// Teng Hui Xin Alicia, A0259064Y

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const API_BASE = "http://localhost:6060/api/v1";
const SEARCH_KEYWORD = __ENV.SEARCH_KEYWORD || "laptop";

const searchErrors = new Counter("search_errors");
const searchErrorRate = new Rate("search_error_rate");
const searchDuration = new Trend("search_duration", true);

const MIN_SLEEP = 0.3;
const MAX_SLEEP = 1.3;

export const options = {
  summaryTrendStats: [
    "avg",
    "min",
    "med",
    "max",
    "p(75)",
    "p(90)",
    "p(95)",
    "count",
  ],

  stages: [
    { duration: "10s", target: 10 },
    { duration: "20s", target: 400 },
    { duration: "30s", target: 400 },
    { duration: "20s", target: 0 },
  ],

  thresholds: {
    "http_req_duration{endpoint:search}": ["p(90)<3000"],
    "http_req_failed{endpoint:search}": ["rate<0.05"],
    search_error_rate: ["rate<0.02"],
  },
};

export default function () {
  const searchResponse = http.get(
    `${API_BASE}/product/search/${encodeURIComponent(SEARCH_KEYWORD)}`,
    { tags: { endpoint: "search" } },
  );

  searchDuration.add(searchResponse.timings.duration);

  let searchJson;
  try {
    searchJson = searchResponse.json();
  } catch (_) {}

  const searchOk = check(searchResponse, {
    "search: status 200": (r) => r.status === 200,
    "search: returns array": () => Array.isArray(searchJson),
  });

  searchErrorRate.add(!searchOk);
  if (!searchOk) searchErrors.add(1);

  sleep(Math.random() * (MAX_SLEEP - MIN_SLEEP) + MIN_SLEEP);
}

export function handleSummary(data) {
  const reqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;

  const durationSecs =
    data.state && data.state.testRunDurationMs
      ? data.state.testRunDurationMs / 1000
      : 1;

  const rps = (reqs / durationSecs).toFixed(2);

  const searchMetric = data.metrics.search_duration;
  const searchErrMetric = data.metrics.search_error_rate;

  const searchP90 =
    searchMetric && searchMetric.values["p(90)"] !== undefined
      ? searchMetric.values["p(90)"].toFixed(2) + " ms"
      : "N/A";

  const err =
    searchErrMetric && searchErrMetric.values.rate !== undefined
      ? (searchErrMetric.values.rate * 100).toFixed(2) + " %"
      : "N/A";

  let customTable =
    "\n=================================================================================\n";
  customTable +=
    " Flow              |   Avg RPS   | p90 Response | Search Error Rate\n";
  customTable +=
    "---------------------------------------------------------------------------------\n";
  customTable += ` Product Search    | ${rps.padStart(11)} | ${searchP90.padStart(12)} | ${err.padStart(17)}\n`;
  customTable +=
    "=================================================================================\n\n";

  return {
    stdout:
      textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}
