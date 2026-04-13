// Teng Hui Xin Alicia, A0259064Y

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const API_BASE = "http://localhost:6060/api/v1/product";

const PRODUCT_POOL = [
  { slug: "laptop", id: "66db427fdb0119d9234b27f3" },
  { slug: "smartphone", id: "66db427fdb0119d9234b27f5" },
  { slug: "textbook", id: "66db427fdb0119d9234b27f1" },
];

const productViewErrors = new Counter("product_view_errors");
const productViewErrorRate = new Rate("product_view_error_rate");
const productViewDuration = new Trend("product_view_duration", true);
const productViewReqs = new Counter("product_view_reqs");

export const options = {

  setupTimeout: "3m",

  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],

  stages: [
    { duration: "10s", target: 10 },   // baseline
    { duration: "20s", target: 250 },  // spike
    { duration: "30s", target: 250 },  // hold peak
    { duration: "20s", target: 0 },    // recovery
  ],

  thresholds: {
    "http_req_duration{endpoint:product-details}": ["p(90)<3000"],
    "http_req_failed{endpoint:product-details}": ["rate<0.05"],
    "http_req_duration{endpoint:product-photo}": ["p(90)<3000"],
    "http_req_failed{endpoint:product-photo}": ["rate<0.10"],
    product_view_error_rate: ["rate<0.02"],
  },
};

export default function () {
  if (PRODUCT_POOL.length === 0) {
    console.warn("No products available — skipping iteration");
    sleep(1);
    return;
  }

  const selectedProduct =
    PRODUCT_POOL[Math.floor(Math.random() * PRODUCT_POOL.length)];

  const detailsRes = http.get(
    `${API_BASE}/get-product/${encodeURIComponent(selectedProduct.slug)}`,
    {
      tags: { endpoint: "product-details" },
    }
  );

  const photoRes = http.get(
    `${API_BASE}/product-photo/${selectedProduct.id}`,
    {
      tags: { endpoint: "product-photo" },
    }
  );

  productViewReqs.add(1);
  productViewDuration.add(
    detailsRes.timings.duration + photoRes.timings.duration
  );

  let detailsJson;
  try {
    detailsJson = detailsRes.json();
  } catch (_) {}

  const productViewOk = check(detailsRes, {
    "product-view: details status 200": (r) => r.status === 200,
    "product-view: details returns object": () =>
      detailsJson !== null && typeof detailsJson === "object",
  }) &&
    check(photoRes, {
      "product-view: photo status 200 or 404": (r) =>
        r.status === 200 || r.status === 404,
    });

  productViewErrorRate.add(!productViewOk);
  if (!productViewOk) productViewErrors.add(1);

  sleep(Math.random() * 1.0 + 0.5);
}

export function handleSummary(data) {
  const reqs = data.metrics.product_view_reqs
    ? data.metrics.product_view_reqs.values.count
    : 0;

  const durationSecs =
    data.state && data.state.testRunDurationMs
      ? data.state.testRunDurationMs / 1000
      : 1;

  const rps = (reqs / durationSecs).toFixed(2);

  const viewMetric = data.metrics.product_view_duration;
  const viewErrMetric = data.metrics.product_view_error_rate;

  const viewP90 =
    viewMetric && viewMetric.values["p(90)"] !== undefined
      ? viewMetric.values["p(90)"].toFixed(2) + " ms"
      : "N/A";

  const err =
    viewErrMetric && viewErrMetric.values.rate !== undefined
      ? (viewErrMetric.values.rate * 100).toFixed(2) + " %"
      : "N/A";

  let customTable = "\n=================================================================================\n";
  customTable += " Flow              |   Avg RPS   | p90 Response | Product View Error Rate\n";
  customTable += "---------------------------------------------------------------------------------\n";
  customTable += ` Product View      | ${rps.padStart(11)} | ${viewP90.padStart(12)} | ${err.padStart(23)}\n`;
  customTable += "=================================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}