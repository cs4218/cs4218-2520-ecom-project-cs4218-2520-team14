// Teng Hui Xin Alicia, A0259064Y

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const API_BASE = "http://localhost:6060/api/v1";
const CATEGORY_ENDPOINT = `${API_BASE}/category/get-category`;

const categoryErrors = new Counter("category_errors");
const categoryErrorRate = new Rate("category_error_rate");
const categoryDuration = new Trend("category_duration", true);
const categoryReqs = new Counter("category_reqs");

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
    { duration: "10s", target: 10 }, // baseline
    { duration: "20s", target: 250 }, // sudden spike
    { duration: "30s", target: 250 }, // hold peak
    { duration: "20s", target: 0 }, // recovery
  ],

  thresholds: {
    "http_req_duration{endpoint:get-category}": ["p(90)<3000"],
    "http_req_failed{endpoint:get-category}": ["rate<0.05"],
    category_error_rate: ["rate<0.02"],
  },
};

export default function () {
  const categoryRes = http.get(CATEGORY_ENDPOINT, {
    tags: { endpoint: "get-category" },
  });

  categoryReqs.add(1);
  categoryDuration.add(categoryRes.timings.duration);

  let categoryJson;
  try {
    categoryJson = categoryRes.json();
  } catch (_) {}

  const categoryOk = check(categoryRes, {
    "category: status 200": (r) => r.status === 200,
    "category: returns array or object": () =>
      Array.isArray(categoryJson) ||
      (categoryJson !== null && typeof categoryJson === "object"),
  });

  categoryErrorRate.add(!categoryOk);
  if (!categoryOk) categoryErrors.add(1);

  sleep(Math.random() * 1.0 + 0.3);
}

export function handleSummary(data) {
  const reqs = data.metrics.category_reqs
    ? data.metrics.category_reqs.values.count
    : 0;

  const durationSecs =
    data.state && data.state.testRunDurationMs
      ? data.state.testRunDurationMs / 1000
      : 1;

  const rps = (reqs / durationSecs).toFixed(2);

  const categoryMetric = data.metrics.category_duration;
  const categoryErrMetric = data.metrics.category_error_rate;

  const categoryP90 =
    categoryMetric && categoryMetric.values["p(90)"] !== undefined
      ? categoryMetric.values["p(90)"].toFixed(2) + " ms"
      : "N/A";

  const err =
    categoryErrMetric && categoryErrMetric.values.rate !== undefined
      ? (categoryErrMetric.values.rate * 100).toFixed(2) + " %"
      : "N/A";

  let customTable =
    "\n=================================================================================\n";
  customTable +=
    " Flow              |   Avg RPS   | p90 Response | Category Error Rate\n";
  customTable +=
    "---------------------------------------------------------------------------------\n";
  customTable += ` Get Category      | ${rps.padStart(11)} | ${categoryP90.padStart(12)} | ${err.padStart(19)}\n`;
  customTable +=
    "=================================================================================\n\n";

  return {
    stdout:
      textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}
