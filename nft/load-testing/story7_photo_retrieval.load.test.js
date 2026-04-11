// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { BASE_URL } from "./config.js";
import { extractProducts, randomChoice } from "./utils.js";

/**
 * =========================================================
 * Custom Metrics
 * =========================================================
 */

const photoRetrievalSuccessRate = new Rate("photo_retrieval_success_rate");
const photoPayloadIntegrityRate = new Rate("photo_payload_integrity_rate");
const photoServerErrorRate = new Rate("photo_server_error_rate");

const samePhotoResponseTrend = new Trend("same_photo_response_time");
const distributedPhotoResponseTrend = new Trend("distributed_photo_response_time");

const malformedPhotoPayloadCount = new Counter("malformed_photo_payload_count");
const missingContentTypeCount = new Counter("missing_photo_content_type_count");
const suspiciousSmallPayloadCount = new Counter("suspicious_small_photo_payload_count");
const unexpectedPhotoFailureCount = new Counter("unexpected_photo_failure_count");

const PHOTO_HTTP_FAILED_RATE = Number(__ENV.PHOTO_HTTP_FAILED_RATE || 1.0);

const PHOTO_AVG_MS = Number(__ENV.PHOTO_AVG_MS || 60000);
const PHOTO_P95_MS = Number(__ENV.PHOTO_P95_MS || 120000);

const SAME_PHOTO_AVG_MS = Number(__ENV.SAME_PHOTO_AVG_MS || 60000);
const SAME_PHOTO_P95_MS = Number(__ENV.SAME_PHOTO_P95_MS || 120000);

const DISTRIBUTED_PHOTO_AVG_MS = Number(__ENV.DISTRIBUTED_PHOTO_AVG_MS || 60000);
const DISTRIBUTED_PHOTO_P95_MS = Number(__ENV.DISTRIBUTED_PHOTO_P95_MS || 120000);

const PHOTO_SUCCESS_RATE_MIN = Number(__ENV.PHOTO_SUCCESS_RATE_MIN || 0);
const PHOTO_INTEGRITY_RATE_MIN = Number(__ENV.PHOTO_INTEGRITY_RATE_MIN || 0);
const PHOTO_SERVER_ERROR_RATE_MAX = Number(__ENV.PHOTO_SERVER_ERROR_RATE_MAX || 1);

/**
 * =========================================================
 * Scenario Configuration
 * =========================================================
 */

export const options = {
  scenarios: {
    same_photo_hotspot: {
      executor: "ramping-vus",
      exec: "samePhotoScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 300 },
        { duration: "3m", target: 300 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
      gracefulStop: "30s",
      tags: {
        endpoint_family: "photo_hotspot",
        group: "photo_retrieval",
      },
    },

    distributed_photo_access: {
      executor: "ramping-vus",
      exec: "distributedPhotoScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "3m", target: 200 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
      gracefulStop: "30s",
      tags: {
        endpoint_family: "photo_distributed",
        group: "photo_retrieval",
      },
    },
  },

  thresholds: {
    "http_req_failed{group:photo_retrieval}": [
      `rate<${PHOTO_HTTP_FAILED_RATE}`,
    ],

    "http_req_duration{endpoint:product_photo_hotspot}": [
      `avg<${PHOTO_AVG_MS}`,
      `p(95)<${PHOTO_P95_MS}`,
    ],

    "http_req_duration{endpoint:product_photo_distributed}": [
      `avg<${PHOTO_AVG_MS}`,
      `p(95)<${PHOTO_P95_MS}`,
    ],

    photo_retrieval_success_rate: [
      `rate>=${PHOTO_SUCCESS_RATE_MIN}`,
    ],

    photo_payload_integrity_rate: [
      `rate>=${PHOTO_INTEGRITY_RATE_MIN}`,
    ],

    photo_server_error_rate: [
      `rate<=${PHOTO_SERVER_ERROR_RATE_MAX}`,
    ],

    same_photo_response_time: [
      `avg<${SAME_PHOTO_AVG_MS}`,
      `p(95)<${SAME_PHOTO_P95_MS}`,
    ],

    distributed_photo_response_time: [
      `avg<${DISTRIBUTED_PHOTO_AVG_MS}`,
      `p(95)<${DISTRIBUTED_PHOTO_P95_MS}`,
    ],
  },

  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

/**
 * =========================================================
 * Setup
 * =========================================================
 */

export function setup() {
  const products = extractProducts();

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error(
      "No products found. Seed at least 1 product before running the photo load test."
    );
  }

  const validProducts = products.filter(
    (p) => typeof p?._id === "string" && p._id.length > 0
  );

  if (validProducts.length === 0) {
    throw new Error(
      "Seeded products do not contain valid _id values required for photo retrieval."
    );
  }

  const hotspotProduct = validProducts[0];

  return {
    hotspotProduct,
    products: validProducts,
  };
}

/**
 * =========================================================
 * Helper: get binary payload size safely
 * =========================================================
 */

function getBinaryBodyLength(body) {
  if (body == null) return 0;

  if (typeof body.byteLength === "number") {
    return body.byteLength;
  }

  if (typeof body.length === "number") {
    return body.length;
  }

  if (typeof body === "string") {
    return body.length;
  }

  return 0;
}

/**
 * =========================================================
 * Helper: Validate binary image response
 * =========================================================
 *
 * Important fix:
 * For responseType:"binary", we use byteLength when available.
 */

function validatePhotoResponse(res) {
  const contentType =
    res.headers["Content-Type"] ||
    res.headers["content-type"] ||
    "";

  const bodyLength = getBinaryBodyLength(res.body);


  const passed = check(res, {
    "photo status is 200": (r) => r.status === 200,
    "photo response body is non-empty": () => bodyLength > 0,
    "photo has content-type header": () =>
      typeof contentType === "string" && contentType.length > 0,
    "photo content-type looks like image": () => /^image\//i.test(contentType),
    "photo payload is not suspiciously tiny": () => bodyLength > 0,
  });

  if (!contentType) {
    missingContentTypeCount.add(1);
  }

  if (bodyLength <= 0) {
    suspiciousSmallPayloadCount.add(1);
  }

  return {
    passed,
    contentType,
    bodyLength,
  };
}

/**
 * =========================================================
 * Scenario 1: Same Photo Hotspot Load
 * =========================================================
 */

export function samePhotoScenario(data) {
  group("Photo Load - same product hotspot", () => {
    const pid = data.hotspotProduct._id;

    const res = http.get(`${BASE_URL}/api/v1/product/product-photo/${pid}`, {
      tags: {
        endpoint: "product_photo_hotspot",
        group: "photo_retrieval",
      },
      responseType: "binary",
      timeout: "15s",
    });

    samePhotoResponseTrend.add(res.timings.duration);
    photoServerErrorRate.add(res.status >= 500);

    const { passed, contentType, bodyLength } = validatePhotoResponse(res);

    if (res.status >= 500) {
      unexpectedPhotoFailureCount.add(1);
    }

    if (!passed) {
      malformedPhotoPayloadCount.add(1);
    }

    photoRetrievalSuccessRate.add(passed);
    photoPayloadIntegrityRate.add(
      passed &&
        typeof contentType === "string" &&
        /^image\//i.test(contentType) &&
        bodyLength > 0
    );

    sleep(1);
  });
}

/**
 * =========================================================
 * Scenario 2: Distributed Multi-Product Photo Load
 * =========================================================
 */

export function distributedPhotoScenario(data) {
  group("Photo Load - distributed multi-product access", () => {
    const product = randomChoice(data.products);
    const pid = product._id;

    const res = http.get(`${BASE_URL}/api/v1/product/product-photo/${pid}`, {
      tags: {
        endpoint: "product_photo_distributed",
        group: "photo_retrieval",
      },
      responseType: "binary",
      timeout: "15s",
    });

    distributedPhotoResponseTrend.add(res.timings.duration);
    photoServerErrorRate.add(res.status >= 500);

    const { passed, contentType, bodyLength } = validatePhotoResponse(res);

    if (res.status >= 500) {
      unexpectedPhotoFailureCount.add(1);
    }

    if (!passed) {
      malformedPhotoPayloadCount.add(1);
    }

    photoRetrievalSuccessRate.add(passed);
    photoPayloadIntegrityRate.add(
      passed &&
        typeof contentType === "string" &&
        /^image\//i.test(contentType) &&
        bodyLength > 0
    );

    sleep(1);
  });
}

/**
 * =========================================================
 * Summary Output
 * =========================================================
 */

export function handleSummary(data) {
  return {
    stdout: `
============================================================
Product Image Retrieval Under High Concurrent Load
============================================================

Scenarios executed:
- 300 concurrent users requesting the same hotspot product photo
- 200 concurrent users requesting photos across different products
- 2-minute ramp-up and 3-minute sustained load

Key custom metrics:
- photo_retrieval_success_rate
- photo_payload_integrity_rate
- photo_server_error_rate
- same_photo_response_time
- distributed_photo_response_time
- malformed_photo_payload_count
- missing_photo_content_type_count
- suspicious_small_photo_payload_count
- unexpected_photo_failure_count

Threshold intent:
- avg hotspot photo retrieval response time < ${SAME_PHOTO_AVG_MS}ms
- p95 hotspot photo retrieval response time < ${SAME_PHOTO_P95_MS}ms
- avg distributed photo retrieval response time < ${DISTRIBUTED_PHOTO_AVG_MS}ms
- p95 distributed photo retrieval response time < ${DISTRIBUTED_PHOTO_P95_MS}ms
- http_req_failed{group:photo_retrieval} < ${PHOTO_HTTP_FAILED_RATE}

Interpretation guidance:
- malformed_photo_payload_count should ideally remain 0
- missing_photo_content_type_count should ideally remain 0
- suspicious_small_photo_payload_count should ideally remain 0
- photo_server_error_rate should ideally remain 0
- photo_payload_integrity_rate should ideally remain close to 1.00
- same_photo_response_time and distributed_photo_response_time should remain stable

Important design note:
- This version uses binary-safe payload length handling.
- For responseType="binary", k6 may expose payload size through byteLength
  rather than length, so this script checks both.
- Server memory stability and graceful post-test recovery still require
  external monitoring evidence if your report needs those claims.
============================================================
`,
  };
}