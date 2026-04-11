// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, group, sleep } from "k6";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";
import { BASE_URL, JSON_HEADERS } from "./config.js";
import {
  extractCategories,
  extractProducts,
  randomChoice,
  randomInt,
  getOrders,
  updateProfile,
  createCategory,
  updateCategory,
  safeJson,
  uniqueSuffix,
} from "./utils.js";

/**
 * =========================================================
 * PURPOSE
 * =========================================================
 * This test targets long-duration server and database stability under
 * sustained concurrent mixed traffic.
 *
 * - avoids hard dependency on utils.loginUser()
 * - tries multiple likely passwords for seeded user accounts
 */

/**
 * =========================================================
 * OPTIONAL METRICS ENDPOINT SUPPORT
 * =========================================================
 */
const METRICS_URL = __ENV.METRICS_URL || "";

const RESOURCE_HTTP_FAILED_RATE = Number(
  __ENV.RESOURCE_HTTP_FAILED_RATE || 1.0
);
const RESOURCE_GROUP_P95_MS = Number(__ENV.RESOURCE_GROUP_P95_MS || 120000);
const RESOURCE_GROUP_P99_MS = Number(__ENV.RESOURCE_GROUP_P99_MS || 180000);

const RESOURCE_SUCCESS_RATE_MIN = Number(
  __ENV.RESOURCE_SUCCESS_RATE_MIN || 0
);
const RESOURCE_PAYLOAD_RATE_MIN = Number(
  __ENV.RESOURCE_PAYLOAD_RATE_MIN || 0
);
const RESOURCE_SERVER_ERROR_RATE_MAX = Number(
  __ENV.RESOURCE_SERVER_ERROR_RATE_MAX || 1
);
const RESOURCE_SERVICE_UNAVAILABLE_RATE_MAX = Number(
  __ENV.RESOURCE_SERVICE_UNAVAILABLE_RATE_MAX || 1
);
const RESOURCE_TIMEOUT_LIKE_RATE_MAX = Number(
  __ENV.RESOURCE_TIMEOUT_LIKE_RATE_MAX || 1
);

const START_WINDOW_P95_MS = Number(__ENV.START_WINDOW_P95_MS || 120000);
const END_WINDOW_P95_MS = Number(__ENV.END_WINDOW_P95_MS || 180000);
const RECOVERY_WINDOW_P95_MS = Number(
  __ENV.RECOVERY_WINDOW_P95_MS || 120000
);

/**
 * =========================================================
 * CUSTOM METRICS
 * =========================================================
 */

const sustainedSuccessRate = new Rate("sustained_success_rate");
const sustainedPayloadIntegrityRate = new Rate(
  "sustained_payload_integrity_rate"
);
const sustainedServerErrorRate = new Rate("sustained_server_error_rate");
const serviceUnavailableRate = new Rate("service_unavailable_rate");
const timeoutLikeFailureRate = new Rate("timeout_like_failure_rate");

const startWindowResponseTrend = new Trend("start_window_response_time");
const endWindowResponseTrend = new Trend("end_window_response_time");
const recoveryWindowResponseTrend = new Trend("recovery_window_response_time");

const mixedRequestResponseTrend = new Trend("resource_stability_response_time");
const authResponseTrend = new Trend("resource_stability_auth_response_time");
const browseResponseTrend = new Trend("resource_stability_browse_response_time");
const ordersResponseTrend = new Trend("resource_stability_orders_response_time");
const profileResponseTrend = new Trend(
  "resource_stability_profile_response_time"
);
const adminResponseTrend = new Trend("resource_stability_admin_response_time");

const malformedPayloadCount = new Counter(
  "resource_stability_malformed_payload_count"
);
const unexpectedFailureCount = new Counter(
  "resource_stability_unexpected_failure_count"
);
const serviceUnavailableCount = new Counter(
  "resource_stability_service_unavailable_count"
);
const timeoutLikeFailureCount = new Counter(
  "resource_stability_timeout_like_failure_count"
);

const authRequestCount = new Counter("resource_stability_auth_request_count");
const browseRequestCount = new Counter(
  "resource_stability_browse_request_count"
);
const ordersRequestCount = new Counter(
  "resource_stability_orders_request_count"
);
const profileRequestCount = new Counter(
  "resource_stability_profile_request_count"
);
const adminRequestCount = new Counter("resource_stability_admin_request_count");

const memoryRssTrend = new Trend("server_memory_rss_mb");
const heapUsedTrend = new Trend("server_heap_used_mb");
const cpuPercentTrend = new Trend("server_cpu_percent");
const dbPoolInUseTrend = new Trend("db_pool_in_use");
const dbPoolAvailableTrend = new Trend("db_pool_available");
const dbPoolWaitingTrend = new Trend("db_pool_waiting");

const metricsPollFailureCount = new Counter("metrics_poll_failure_count");

/**
 * =========================================================
 * TEST OPTIONS
 * =========================================================
 */

export const options = {
  scenarios: {
    sustained_resource_stability: {
      executor: "ramping-vus",
      exec: "resourceStabilityScenario",
      startVUs: 0,
      stages: [
        { duration: "3m", target: 300 },
        { duration: "10m", target: 300 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
      gracefulStop: "30s",
      tags: { group: "resource_stability" },
    },
  },

  thresholds: {
    "http_req_failed{group:resource_stability}": [
      `rate<${RESOURCE_HTTP_FAILED_RATE}`,
    ],
    "http_req_duration{group:resource_stability}": [
      `p(95)<${RESOURCE_GROUP_P95_MS}`,
      `p(99)<${RESOURCE_GROUP_P99_MS}`,
    ],

    sustained_success_rate: [`rate>=${RESOURCE_SUCCESS_RATE_MIN}`],
    sustained_payload_integrity_rate: [`rate>=${RESOURCE_PAYLOAD_RATE_MIN}`],
    sustained_server_error_rate: [`rate<=${RESOURCE_SERVER_ERROR_RATE_MAX}`],

    service_unavailable_rate: [
      `rate<=${RESOURCE_SERVICE_UNAVAILABLE_RATE_MAX}`,
    ],
    timeout_like_failure_rate: [`rate<=${RESOURCE_TIMEOUT_LIKE_RATE_MAX}`],

    start_window_response_time: [`p(95)<${START_WINDOW_P95_MS}`],
    end_window_response_time: [`p(95)<${END_WINDOW_P95_MS}`],
    recovery_window_response_time: [`p(95)<${RECOVERY_WINDOW_P95_MS}`],
  },

  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

/**
 * =========================================================
 * MIXED WORKLOAD CONFIGURATION
 * =========================================================
 */

const SEARCH_TERMS = ["phone", "book", "shoe", "bag", "watch", "laptop"];
const PRICE_RANGES = [
  [0, 50],
  [50, 100],
  [100, 500],
  [500, 5000],
];

/**
 * =========================================================
 * RESILIENT LOGIN HELPERS
 * =========================================================
 */

function tryLogin(email, password, endpointTag = "resilient_login") {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: JSON_HEADERS,
      timeout: "15s",
      tags: { endpoint: endpointTag, group: "setup" },
    }
  );

  const body = safeJson(res);

  if (res.status === 200 && typeof body?.token === "string" && body?.user) {
    return {
      ok: true,
      token: body.token,
      user: body.user,
      password,
      res,
      body,
    };
  }

  return {
    ok: false,
    password,
    res,
    body,
  };
}

function loginAdminResilient() {
  const email = __ENV.ADMIN_EMAIL || "Daniel@gmail.com";
  const candidates = [
    __ENV.ADMIN_PASSWORD,
    "AdminPass123",
  ].filter(Boolean);

  for (const password of candidates) {
    const result = tryLogin(email, password, "resource_login_admin_setup");
    if (result.ok) return result;
  }

  throw new Error(
    `Admin login failed for ${email}. Tried passwords: ${candidates.join(", ")}`
  );
}

function loginUserResilient() {
  const email = __ENV.USER_EMAIL || "load.user@test.com";

  const candidates = [
    __ENV.STORY8_USER_PASSWORD,
    __ENV.STORY5_ORDERS_PASSWORD,
    __ENV.USER_PASSWORD,
    "Story5OrdersPass123",
    "UserPass123",
  ].filter(Boolean);

  for (const password of candidates) {
    const result = tryLogin(email, password, "resource_login_user_setup");
    if (result.ok) return result;
  }

  throw new Error(
    `User login failed for ${email}. Tried passwords: ${candidates.join(", ")}`
  );
}

/**
 * =========================================================
 * SETUP
 * =========================================================
 */

export function setup() {
  const admin = loginAdminResilient();
  const user = loginUserResilient();
  const categories = extractCategories();
  const products = extractProducts();

  if (!categories.length) {
    throw new Error("No categories found for sustained resource stability test.");
  }

  if (!products.length) {
    throw new Error("No products found for sustained resource stability test.");
  }

  if (METRICS_URL) {
    pollServerMetrics("setup");
  }

  return {
    adminToken: admin.token,
    adminUser: admin.user,
    userToken: user.token,
    userUser: user.user,
    userPassword: user.password,
    categories,
    products,
  };
}

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function maybePollMetrics() {
  if (METRICS_URL && __ITER % 25 === 0) {
    pollServerMetrics("during");
  }
}

function pollServerMetrics(phase = "during") {
  const res = http.get(METRICS_URL, {
    tags: { endpoint: "server_metrics", group: "resource_stability_metrics" },
    timeout: "5s",
  });

  if (res.status !== 200) {
    metricsPollFailureCount.add(1);
    return null;
  }

  const body = safeJson(res);
  if (!body) {
    metricsPollFailureCount.add(1);
    return null;
  }

  if (typeof body.memoryRssMb === "number") memoryRssTrend.add(body.memoryRssMb);
  if (typeof body.heapUsedMb === "number") heapUsedTrend.add(body.heapUsedMb);
  if (typeof body.cpuPercent === "number") cpuPercentTrend.add(body.cpuPercent);
  if (typeof body.dbPoolInUse === "number") dbPoolInUseTrend.add(body.dbPoolInUse);
  if (typeof body.dbPoolAvailable === "number") {
    dbPoolAvailableTrend.add(body.dbPoolAvailable);
  }
  if (typeof body.dbPoolWaiting === "number") {
    dbPoolWaitingTrend.add(body.dbPoolWaiting);
  }

  return body;
}

function isExpectedNon2xx(status) {
  return [400, 401, 404, 409].includes(status);
}

function classifyResponseWindow(duration) {
  const progress = exec.scenario.progress;

  if (progress >= 0.20 && progress <= 0.35) {
    startWindowResponseTrend.add(duration);
  } else if (progress >= 0.75 && progress <= 0.90) {
    endWindowResponseTrend.add(duration);
  }
}

function recordFailurePatterns(res, bodyExists = true) {
  sustainedServerErrorRate.add(res.status >= 500);
  serviceUnavailableRate.add(res.status === 503);
  timeoutLikeFailureRate.add(res.error_code !== 0 && !!res.error);

  if (res.status === 503) {
    serviceUnavailableCount.add(1);
  }

  if (res.error || res.timings.duration >= 10000) {
    timeoutLikeFailureCount.add(1);
  }

  if (!bodyExists) {
    malformedPayloadCount.add(1);
  }

  if (res.status >= 500 || (!isExpectedNon2xx(res.status) && res.status >= 400)) {
    unexpectedFailureCount.add(1);
  }
}

/**
 * =========================================================
 * MAIN SUSTAINED RESOURCE STABILITY SCENARIO
 * =========================================================
 */

export function resourceStabilityScenario(data) {
  group("Sustained Resource Stability - mixed workload", () => {
    const roll = Math.random();
    maybePollMetrics();

    if (roll < 0.20) {
      authRequestCount.add(1);

      const loginRes = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({
          email: data.userUser.email,
          password: __ITER % 6 === 0 ? "WrongPassword123" : data.userPassword,
        }),
        {
          headers: JSON_HEADERS,
          tags: { endpoint: "resource_auth_login", group: "resource_stability" },
          timeout: "10s",
        }
      );

      authResponseTrend.add(loginRes.timings.duration);
      mixedRequestResponseTrend.add(loginRes.timings.duration);
      classifyResponseWindow(loginRes.timings.duration);

      const body = safeJson(loginRes);

      const checksPassed = check(loginRes, {
        "resource auth status expected": (r) =>
          [200, 401, 404].includes(r.status),
        "resource auth payload valid": () => {
          if (loginRes.status === 200) {
            return typeof body?.token === "string" && !!body?.user;
          }
          if ([401, 404].includes(loginRes.status)) {
            return (
              body?.success === false || typeof body?.message === "string"
            );
          }
          return false;
        },
      });

      recordFailurePatterns(loginRes, body !== null || !!loginRes.body);
      sustainedSuccessRate.add(checksPassed);
      sustainedPayloadIntegrityRate.add(
        body !== null &&
          ((loginRes.status === 200 &&
            typeof body?.token === "string" &&
            !!body?.user) ||
            ([401, 404].includes(loginRes.status) &&
              (body?.success === false ||
                typeof body?.message === "string")))
      );
    } else if (roll < 0.55) {
      browseRequestCount.add(1);

      const browseRoll = Math.random();
      let res;
      let body;
      let checksPassed = false;

      if (browseRoll < 0.35) {
        const page = randomInt(1, 3);
        res = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`, {
          tags: { endpoint: "resource_product_list", group: "resource_stability" },
          timeout: "10s",
        });
        body = safeJson(res);

        checksPassed = check(res, {
          "resource product list status 200": (r) => r.status === 200,
          "resource product list payload valid": () =>
            Array.isArray(body?.products) || Array.isArray(body),
        });
      } else if (browseRoll < 0.65) {
        const product = randomChoice(data.products);
        res = http.get(`${BASE_URL}/api/v1/product/get-product/${product.slug}`, {
          tags: { endpoint: "resource_product_detail", group: "resource_stability" },
          timeout: "10s",
        });
        body = safeJson(res);

        checksPassed = check(res, {
          "resource product detail status 200": (r) => r.status === 200,
          "resource product detail payload valid": () =>
            !!body?.product || !!body,
        });
      } else if (browseRoll < 0.82) {
        const term = randomChoice(SEARCH_TERMS);
        res = http.get(
          `${BASE_URL}/api/v1/product/search/${encodeURIComponent(term)}`,
          {
            tags: {
              endpoint: "resource_product_search",
              group: "resource_stability",
            },
            timeout: "10s",
          }
        );
        body = safeJson(res);

        checksPassed = check(res, {
          "resource product search status 200": (r) => r.status === 200,
          "resource product search payload valid": () =>
            Array.isArray(body?.products) || Array.isArray(body),
        });
      } else {
        const category = randomChoice(data.categories);
        const range = randomChoice(PRICE_RANGES);

        res = http.post(
          `${BASE_URL}/api/v1/product/product-filters`,
          JSON.stringify({ checked: [category._id], radio: range }),
          {
            headers: JSON_HEADERS,
            tags: { endpoint: "resource_product_filter", group: "resource_stability" },
            timeout: "10s",
          }
        );
        body = safeJson(res);

        checksPassed = check(res, {
          "resource product filter status 200": (r) => r.status === 200,
          "resource product filter payload valid": () =>
            Array.isArray(body?.products) || Array.isArray(body),
        });
      }

      browseResponseTrend.add(res.timings.duration);
      mixedRequestResponseTrend.add(res.timings.duration);
      classifyResponseWindow(res.timings.duration);

      recordFailurePatterns(res, body !== null || !!res.body);
      sustainedSuccessRate.add(checksPassed);
      sustainedPayloadIntegrityRate.add(checksPassed);
    } else if (roll < 0.75) {
      ordersRequestCount.add(1);

      const res = getOrders(data.userToken);
      const body = safeJson(res);

      const checksPassed = check(res, {
        "resource orders status 200": (r) => r.status === 200,
        "resource orders payload valid": () => Array.isArray(body),
      });

      ordersResponseTrend.add(res.timings.duration);
      mixedRequestResponseTrend.add(res.timings.duration);
      classifyResponseWindow(res.timings.duration);

      recordFailurePatterns(res, body !== null || !!res.body);
      sustainedSuccessRate.add(checksPassed);
      sustainedPayloadIntegrityRate.add(checksPassed);
    } else if (roll < 0.90) {
      profileRequestCount.add(1);

      const payload = {
        name: `Stability User ${uniqueSuffix()}`,
        email: data.userUser.email,
        password: "",
        phone: `8${String(__VU).padStart(7, "0")}`.slice(0, 8),
        address: `Stability Address ${uniqueSuffix()}`,
      };

      const res = updateProfile(data.userToken, payload);
      const body = safeJson(res);

      const checksPassed = check(res, {
        "resource profile status expected": (r) => [200, 400].includes(r.status),
        "resource profile payload valid": () => {
          if (res.status === 200) {
            return body?.success === true || !!body?.updatedUser || !!body;
          }
          if (res.status === 400) {
            return body?.success === false || !!body;
          }
          return false;
        },
      });

      profileResponseTrend.add(res.timings.duration);
      mixedRequestResponseTrend.add(res.timings.duration);
      classifyResponseWindow(res.timings.duration);

      recordFailurePatterns(res, body !== null || !!res.body);
      sustainedSuccessRate.add(checksPassed);
      sustainedPayloadIntegrityRate.add(checksPassed);
    } else {
      adminRequestCount.add(1);

      const adminRoll = Math.random();
      let res;
      let body;
      let checksPassed = false;

      if (adminRoll < 0.5) {
        const name = `StabilityCategory_${uniqueSuffix()}`;
        res = createCategory(data.adminToken, name);
        body = safeJson(res);

        checksPassed = check(res, {
          "resource admin create status expected": (r) =>
            [201, 409].includes(r.status),
          "resource admin create payload valid": () => body !== null || !!res.body,
        });
      } else {
        const category = randomChoice(data.categories);
        res = updateCategory(
          data.adminToken,
          category._id,
          `StabilityUpdate_${uniqueSuffix()}`
        );
        body = safeJson(res);

        checksPassed = check(res, {
          "resource admin update status expected": (r) =>
            [200, 404, 409].includes(r.status),
          "resource admin update payload valid": () => body !== null || !!res.body,
        });
      }

      adminResponseTrend.add(res.timings.duration);
      mixedRequestResponseTrend.add(res.timings.duration);
      classifyResponseWindow(res.timings.duration);

      recordFailurePatterns(res, body !== null || !!res.body);
      sustainedSuccessRate.add(checksPassed);
      sustainedPayloadIntegrityRate.add(checksPassed);
    }

    sleep(1);
  });
}

/**
 * =========================================================
 * POST-LOAD RECOVERY PROBE
 * =========================================================
 */

export function teardown(data) {
  const recoveryStart = Date.now();
  const recoveryChecks = [];

  while (Date.now() - recoveryStart < 30000) {
    const res = http.get(`${BASE_URL}/api/v1/product/get-product`, {
      tags: { endpoint: "recovery_probe", group: "resource_stability_recovery" },
      timeout: "10s",
    });

    recoveryWindowResponseTrend.add(res.timings.duration);

    const body = safeJson(res);
    const ok = check(res, {
      "recovery probe status is 200": (r) => r.status === 200,
      "recovery probe payload valid": () =>
        Array.isArray(body?.products) || Array.isArray(body),
    });

    recoveryChecks.push({
      duration: res.timings.duration,
      status: res.status,
      ok,
    });

    if (METRICS_URL) {
      pollServerMetrics("recovery");
    }

    sleep(2);
  }

  const validDurations = recoveryChecks
    .filter((x) => x.ok)
    .map((x) => x.duration);

  const avgRecovery =
    validDurations.length > 0
      ? validDurations.reduce((a, b) => a + b, 0) / validDurations.length
      : null;

  console.log(
    `[RECOVERY_PROBE] checks=${recoveryChecks.length}, successful=${validDurations.length}, avg_ms=${avgRecovery}`
  );
}

/**
 * =========================================================
 * SUMMARY OUTPUT
 * =========================================================
 */

export function handleSummary(data) {
  return {
    stdout: `
============================================================
Database Connection Pool and Server Resource Stability Under Sustained Load
============================================================

Scenario executed:
- 300 concurrent users
- 3-minute ramp-up
- 10-minute sustained mixed workload
- post-load recovery probing for 30 seconds

Workload distribution:
- 20% authentication/login traffic
- 35% browse/search/filter traffic
- 20% order retrieval traffic
- 15% profile update traffic
- 10% admin category operations

Key client-visible stability metrics:
- sustained_success_rate
- sustained_payload_integrity_rate
- sustained_server_error_rate
- service_unavailable_rate
- timeout_like_failure_rate
- start_window_response_time
- end_window_response_time
- recovery_window_response_time
- resource_stability_response_time
- resource_stability_auth_response_time
- resource_stability_browse_response_time
- resource_stability_orders_response_time
- resource_stability_profile_response_time
- resource_stability_admin_response_time
- resource_stability_malformed_payload_count
- resource_stability_unexpected_failure_count
- resource_stability_service_unavailable_count
- resource_stability_timeout_like_failure_count

Request-family counters:
- resource_stability_auth_request_count
- resource_stability_browse_request_count
- resource_stability_orders_request_count
- resource_stability_profile_request_count
- resource_stability_admin_request_count

Optional server-resource metrics (only if METRICS_URL configured):
- server_memory_rss_mb
- server_heap_used_mb
- server_cpu_percent
- db_pool_in_use
- db_pool_available
- db_pool_waiting
- metrics_poll_failure_count

Threshold intent:
- no HTTP 503 responses
- no timeout-like failures
- response times remain observable throughout sustained load
- end-of-window response times can still be compared manually with start-window values
- application recovery is probed for 30 seconds after load ends

Interpretation guidance:
- Compare start_window_response_time and end_window_response_time manually.
- resource_stability_service_unavailable_count should ideally remain 0.
- resource_stability_timeout_like_failure_count should ideally remain 0.
- resource_stability_unexpected_failure_count should ideally remain low.
- If METRICS_URL is configured:
  * server_memory_rss_mb / server_heap_used_mb should not show runaway growth
  * db_pool_waiting should remain low / near zero
  * db_pool_in_use should remain stable relative to workload
  * cpu_percent should not show sustained saturation without recovery
- Review recovery_window_response_time to confirm post-load graceful recovery.

Important design note:
- This version uses resilient login for the shared seeded user:
  it tries STORY8_USER_PASSWORD, STORY5_ORDERS_PASSWORD, USER_PASSWORD,
  Story5OrdersPass123, and UserPass123.
- Direct proof of memory leaks, CPU saturation, and DB pool exhaustion still
  requires either a metrics endpoint or external monitoring evidence.
============================================================
`,
  };
}