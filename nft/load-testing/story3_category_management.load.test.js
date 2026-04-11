// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { BASE_URL } from "./config.js";
import {
  loginAdmin,
  getCategoryList,
  createCategory,
  updateCategory,
  randomChoice,
  uniqueSuffix,
  safeJson,
} from "./utils.js";

/**
 * =========================================================
 * Custom Metrics
 * =========================================================
 */

const CATEGORY_READ_AVG_MS = Number(__ENV.CATEGORY_READ_AVG_MS || 14500);
const CATEGORY_CREATE_AVG_MS = Number(__ENV.CATEGORY_CREATE_AVG_MS || 18500);
const CATEGORY_UPDATE_AVG_MS = Number(__ENV.CATEGORY_UPDATE_AVG_MS || 13000);

const CATEGORY_GENERAL_P95_MS = Number(__ENV.CATEGORY_GENERAL_P95_MS || 42000);
const CATEGORY_UPDATE_P95_MS = Number(__ENV.CATEGORY_UPDATE_P95_MS || 28000);

const categoryManagementSuccessRate = new Rate(
  "category_management_success_rate"
);
const categoryManagementPayloadIntegrityRate = new Rate(
  "category_management_payload_integrity_rate"
);
const categoryManagementServerErrorRate = new Rate(
  "category_management_server_error_rate"
);

const categoryReadResponseTrend = new Trend("category_read_response_time");
const categoryCreateResponseTrend = new Trend("category_create_response_time");
const categoryUpdateResponseTrend = new Trend("category_update_response_time");

const categoryMixedReadResponseTrend = new Trend(
  "category_mixed_read_response_time"
);
const categoryMixedCreateResponseTrend = new Trend(
  "category_mixed_create_response_time"
);
const categoryMixedUpdateResponseTrend = new Trend(
  "category_mixed_update_response_time"
);

const duplicateCategoryConflictCount = new Counter(
  "duplicate_category_conflict_count"
);
const unexpectedCreateFailureCount = new Counter(
  "unexpected_category_create_failure_count"
);
const malformedCategoryPayloadCount = new Counter(
  "malformed_category_payload_count"
);
const requestFailureCount = new Counter("category_request_failure_count");

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function isHttpResponse(res) {
  return !!res && typeof res.status === "number" && !!res.timings;
}

function isServerErrorStatus(status) {
  return typeof status === "number" && status >= 500;
}

function isTimeoutLikeResponse(res) {
  return (
    !isHttpResponse(res) ||
    res.status === 0 ||
    res.error_code !== 0 ||
    !!res.error
  );
}

function addServerErrorMetric(res) {
  categoryManagementServerErrorRate.add(
    isHttpResponse(res) ? isServerErrorStatus(res.status) : true
  );
}

function addRequestFailureMetric(res) {
  if (isTimeoutLikeResponse(res)) {
    requestFailureCount.add(1);
  }
}

function addTrendIfPresent(trend, res) {
  if (isHttpResponse(res) && res.timings && typeof res.timings.duration === "number") {
    trend.add(res.timings.duration);
  }
}

function parseBodySafely(res) {
  if (!isHttpResponse(res)) return null;
  return safeJson(res);
}

function isValidCategoryObject(category) {
  return (
    !!category &&
    typeof category === "object" &&
    typeof category._id === "string" &&
    typeof category.name === "string" &&
    category.name.trim().length > 0 &&
    typeof category.slug === "string" &&
    category.slug.trim().length > 0
  );
}

function isValidCategoryListPayload(body) {
  return (
    body !== null &&
    body?.success === true &&
    Array.isArray(body?.category) &&
    body.category.every(isValidCategoryObject)
  );
}

function isValidCreateCategoryPayload(body, status) {
  if (body === null) return false;

  if (status === 201) {
    return (
      body?.success === true &&
      body?.message === "New category created" &&
      isValidCategoryObject(body?.category)
    );
  }

  if (status === 409) {
    return (
      body?.success === false &&
      body?.message === "Category Already Exists"
    );
  }

  return false;
}

function isValidUpdateCategoryPayload(body, status) {
  if (body === null) return false;

  if (status === 200) {
    return (
      body?.success === true &&
      body?.message === "Category Updated Successfully" &&
      isValidCategoryObject(body?.category)
    );
  }

  if (status === 404) {
    return (
      body?.success === false &&
      body?.message === "Category not found"
    );
  }

  return false;
}

function recordMalformedPayloadIfNeeded(body) {
  if (body === null) {
    malformedCategoryPayloadCount.add(1);
  }
}

function markFailureMetrics() {
  categoryManagementSuccessRate.add(false);
  categoryManagementPayloadIntegrityRate.add(false);
}

function safeCategoryPool(categories) {
  return Array.isArray(categories) ? categories.filter(isValidCategoryObject) : [];
}

/**
 * =========================================================
 * Scenario Configuration
 * =========================================================
 */

export const options = {
  scenarios: {
    category_reads: {
      executor: "ramping-vus",
      exec: "categoryReadScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 250 },
        { duration: "3m", target: 250 },
        { duration: "30s", target: 0 },
      ],
      tags: {
        endpoint_family: "category_reads",
        group: "category_management",
      },
    },

    category_creates: {
      executor: "ramping-vus",
      exec: "categoryCreateScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "3m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      tags: {
        endpoint_family: "category_creates",
        group: "category_management",
      },
    },

    category_updates: {
      executor: "ramping-vus",
      exec: "categoryUpdateScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "3m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      tags: {
        endpoint_family: "category_updates",
        group: "category_management",
      },
    },

    mixed_category_read_write: {
      executor: "ramping-vus",
      exec: "mixedCategoryScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 300 },
        { duration: "3m", target: 300 },
        { duration: "30s", target: 0 },
      ],
      tags: {
        endpoint_family: "category_mixed",
        group: "category_management",
      },
    },
  },

  thresholds: {
    category_management_success_rate: ["rate>0.98"],
    category_management_payload_integrity_rate: ["rate>0.98"],
    category_management_server_error_rate: ["rate==0"],

    category_read_response_time: [
      `avg<${CATEGORY_READ_AVG_MS}`,
      `p(95)<${CATEGORY_GENERAL_P95_MS}`,
    ],
    category_create_response_time: [
      `avg<${CATEGORY_CREATE_AVG_MS}`,
      `p(95)<${CATEGORY_GENERAL_P95_MS}`,
    ],
    category_update_response_time: [
      `avg<${CATEGORY_UPDATE_AVG_MS}`,
      `p(95)<${CATEGORY_UPDATE_P95_MS}`,
    ],

    category_mixed_read_response_time: [
      `p(95)<${CATEGORY_GENERAL_P95_MS}`,
    ],
    category_mixed_create_response_time: [
      `p(95)<${CATEGORY_GENERAL_P95_MS}`,
    ],
    category_mixed_update_response_time: [
      `p(95)<${CATEGORY_UPDATE_P95_MS}`,
    ],

    "http_req_duration{endpoint:get_category_list}": [
      `avg<${CATEGORY_READ_AVG_MS}`,
      `p(95)<${CATEGORY_GENERAL_P95_MS}`,
    ],
    "http_req_duration{endpoint:create_category}": [
      `avg<${CATEGORY_CREATE_AVG_MS}`,
      `p(95)<${CATEGORY_GENERAL_P95_MS}`,
    ],
    "http_req_duration{endpoint:update_category}": [
      `avg<${CATEGORY_UPDATE_AVG_MS}`,
      `p(95)<${CATEGORY_UPDATE_P95_MS}`,
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
  const admin = loginAdmin();
  const token = admin.token;

  const catRes = getCategoryList();
  const categories = safeCategoryPool(parseBodySafely(catRes)?.category || []);

  if (!token) {
    throw new Error("Admin login failed. No token returned.");
  }

  if (!categories.length) {
    throw new Error(
      "No valid categories found. Seed at least one valid category before running story 3."
    );
  }

  return { token, categories };
}

/**
 * =========================================================
 * Scenario 1: Category Read Load
 * =========================================================
 */

export function categoryReadScenario() {
  group("Story 3 - category reads", () => {
    const res = getCategoryList();

    addTrendIfPresent(categoryReadResponseTrend, res);
    addServerErrorMetric(res);
    addRequestFailureMetric(res);

    if (isTimeoutLikeResponse(res)) {
      markFailureMetrics();
      sleep(1);
      return;
    }

    const body = parseBodySafely(res);
    const payloadIntegrityOk = isValidCategoryListPayload(body);

    const checksPassed = check(res, {
      "category list status is 200": (r) => r.status === 200,
      "category list body is non-empty": (r) => !!r.body && r.body.length > 0,
      "category list parses as JSON": () => body !== null,
      "category list success true": () => body?.success === true,
      "category list has category array": () => Array.isArray(body?.category),
      "category list items valid": () => payloadIntegrityOk,
    });

    recordMalformedPayloadIfNeeded(body);

    categoryManagementSuccessRate.add(checksPassed);
    categoryManagementPayloadIntegrityRate.add(payloadIntegrityOk);

    sleep(1);
  });
}

/**
 * =========================================================
 * Scenario 2: Category Create Load
 * =========================================================
 */

export function categoryCreateScenario(data) {
  group("Story 3 - category creates", () => {
    const name = `LoadTestCategory_${uniqueSuffix()}`;
    const res = createCategory(data.token, name);

    addTrendIfPresent(categoryCreateResponseTrend, res);
    addServerErrorMetric(res);
    addRequestFailureMetric(res);

    if (isTimeoutLikeResponse(res)) {
      unexpectedCreateFailureCount.add(1);
      markFailureMetrics();
      sleep(1);
      return;
    }

    const body = parseBodySafely(res);
    const payloadIntegrityOk = isValidCreateCategoryPayload(body, res.status);

    const checksPassed = check(res, {
      "create category status is 201 or 409": (r) =>
        r.status === 201 || r.status === 409,
      "create category body is non-empty": (r) => !!r.body && r.body.length > 0,
      "create category parses as JSON": () => body !== null,
      "create category response shape valid": () => payloadIntegrityOk,
    });

    if (res.status === 409) {
      duplicateCategoryConflictCount.add(1);
    }

    if (![201, 409].includes(res.status)) {
      unexpectedCreateFailureCount.add(1);
    }

    recordMalformedPayloadIfNeeded(body);

    categoryManagementSuccessRate.add(checksPassed);
    categoryManagementPayloadIntegrityRate.add(payloadIntegrityOk);

    sleep(1);
  });
}

/**
 * =========================================================
 * Scenario 3: Category Update Load
 * =========================================================
 */

export function categoryUpdateScenario(data) {
  group("Story 3 - category updates", () => {
    const categoryPool = safeCategoryPool(data.categories);
    const category = randomChoice(categoryPool);

    if (!category || !category._id || !category.name) {
      markFailureMetrics();
      sleep(1);
      return;
    }

    const newName = `Updated_${category.name}_${__VU}_${__ITER}`;
    const res = updateCategory(data.token, category._id, newName);

    addTrendIfPresent(categoryUpdateResponseTrend, res);
    addServerErrorMetric(res);
    addRequestFailureMetric(res);

    if (isTimeoutLikeResponse(res)) {
      markFailureMetrics();
      sleep(1);
      return;
    }

    const body = parseBodySafely(res);
    const payloadIntegrityOk = isValidUpdateCategoryPayload(body, res.status);

    const checksPassed = check(res, {
      "update category status is 200 or 404": (r) =>
        r.status === 200 || r.status === 404,
      "update category body is non-empty": (r) => !!r.body && r.body.length > 0,
      "update category parses as JSON": () => body !== null,
      "update category response shape valid": () => payloadIntegrityOk,
    });

    recordMalformedPayloadIfNeeded(body);

    categoryManagementSuccessRate.add(checksPassed);
    categoryManagementPayloadIntegrityRate.add(payloadIntegrityOk);

    sleep(1);
  });
}

/**
 * =========================================================
 * Scenario 4: Mixed Read/Write Category Workload
 * =========================================================
 */

export function mixedCategoryScenario(data) {
  group("Story 3 - mixed read/write", () => {
    const random = Math.random();

    if (random < 0.72) {
      const readRes = getCategoryList();

      addTrendIfPresent(categoryMixedReadResponseTrend, readRes);
      addServerErrorMetric(readRes);
      addRequestFailureMetric(readRes);

      if (isTimeoutLikeResponse(readRes)) {
        markFailureMetrics();
        sleep(1);
        return;
      }

      const body = parseBodySafely(readRes);
      const payloadIntegrityOk = isValidCategoryListPayload(body);

      const checksPassed = check(readRes, {
        "mixed read category list status 200": (r) => r.status === 200,
        "mixed read parses as JSON": () => body !== null,
        "mixed read returns valid category array": () => payloadIntegrityOk,
      });

      recordMalformedPayloadIfNeeded(body);

      categoryManagementSuccessRate.add(checksPassed);
      categoryManagementPayloadIntegrityRate.add(payloadIntegrityOk);
    } else if (random < 0.86) {
      const createRes = createCategory(
        data.token,
        `MixedCreate_${uniqueSuffix()}`
      );

      addTrendIfPresent(categoryMixedCreateResponseTrend, createRes);
      addServerErrorMetric(createRes);
      addRequestFailureMetric(createRes);

      if (isTimeoutLikeResponse(createRes)) {
        unexpectedCreateFailureCount.add(1);
        markFailureMetrics();
        sleep(1);
        return;
      }

      const body = parseBodySafely(createRes);
      const payloadIntegrityOk = isValidCreateCategoryPayload(
        body,
        createRes.status
      );

      const checksPassed = check(createRes, {
        "mixed create status valid": (r) => r.status === 201 || r.status === 409,
        "mixed create parses as JSON": () => body !== null,
        "mixed create payload valid": () => payloadIntegrityOk,
      });

      if (createRes.status === 409) {
        duplicateCategoryConflictCount.add(1);
      }

      if (![201, 409].includes(createRes.status)) {
        unexpectedCreateFailureCount.add(1);
      }

      recordMalformedPayloadIfNeeded(body);

      categoryManagementSuccessRate.add(checksPassed);
      categoryManagementPayloadIntegrityRate.add(payloadIntegrityOk);
    } else {
      const categoryPool = safeCategoryPool(data.categories);
      const category = randomChoice(categoryPool);

      if (!category || !category._id || !category.name) {
        markFailureMetrics();
        sleep(1);
        return;
      }

      const updateRes = updateCategory(
        data.token,
        category._id,
        `MixedUpdate_${uniqueSuffix()}`
      );

      addTrendIfPresent(categoryMixedUpdateResponseTrend, updateRes);
      addServerErrorMetric(updateRes);
      addRequestFailureMetric(updateRes);

      if (isTimeoutLikeResponse(updateRes)) {
        markFailureMetrics();
        sleep(1);
        return;
      }

      const body = parseBodySafely(updateRes);
      const payloadIntegrityOk = isValidUpdateCategoryPayload(
        body,
        updateRes.status
      );

      const checksPassed = check(updateRes, {
        "mixed update status valid": (r) =>
          r.status === 200 || r.status === 404,
        "mixed update parses as JSON": () => body !== null,
        "mixed update payload valid": () => payloadIntegrityOk,
      });

      recordMalformedPayloadIfNeeded(body);

      categoryManagementSuccessRate.add(checksPassed);
      categoryManagementPayloadIntegrityRate.add(payloadIntegrityOk);
    }

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
Story 3: Category Management Under Concurrent Admin Load
============================================================

Scenarios executed:
- 250 concurrent users reading category list
- 50 concurrent admins creating categories
- 50 concurrent admins updating categories
- mixed concurrent read/write workload

Key custom metrics:
- category_management_success_rate
- category_management_payload_integrity_rate
- category_management_server_error_rate
- category_read_response_time
- category_create_response_time
- category_update_response_time
- category_mixed_read_response_time
- category_mixed_create_response_time
- category_mixed_update_response_time
- duplicate_category_conflict_count
- unexpected_category_create_failure_count
- malformed_category_payload_count
- category_request_failure_count

Threshold intent:
- avg category listing < 300ms
- avg category create/update < 700ms
- p95 all category operations < 1500ms
- zero 5xx server errors
- no malformed or inconsistent category responses under load

Interpretation guidance:
- duplicate_category_conflict_count > 0 is acceptable and expected under collision conditions
- malformed_category_payload_count should remain 0
- category_management_server_error_rate should remain 0
- category_management_payload_integrity_rate should remain close to 1.00
- request failures/timeouts should remain near 0
============================================================
`,
  };
}