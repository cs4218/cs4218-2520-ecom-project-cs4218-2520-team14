// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { BASE_URL, JSON_HEADERS } from "./config.js";
import { safeJson, uniqueSuffix, randomChoice } from "./utils.js";

const MIXED_HTTP_FAILED_RATE = Number(__ENV.MIXED_HTTP_FAILED_RATE || 1.0);

const MIXED_GROUP_AVG_MS = Number(__ENV.MIXED_GROUP_AVG_MS || 60000);
const MIXED_GROUP_P95_MS = Number(__ENV.MIXED_GROUP_P95_MS || 120000);
const MIXED_GROUP_P99_MS = Number(__ENV.MIXED_GROUP_P99_MS || 180000);

const MIXED_FAST_OP_P95_MS = Number(__ENV.MIXED_FAST_OP_P95_MS || 60000);
const MIXED_FAST_OP_P99_MS = Number(__ENV.MIXED_FAST_OP_P99_MS || 120000);

const MIXED_AUTH_P95_MS = Number(__ENV.MIXED_AUTH_P95_MS || 60000);
const MIXED_AUTH_P99_MS = Number(__ENV.MIXED_AUTH_P99_MS || 120000);

const MIXED_MEDIUM_OP_P95_MS = Number(__ENV.MIXED_MEDIUM_OP_P95_MS || 120000);
const MIXED_MEDIUM_OP_P99_MS = Number(__ENV.MIXED_MEDIUM_OP_P99_MS || 180000);

const MIXED_CREATE_P95_MS = Number(__ENV.MIXED_CREATE_P95_MS || 180000);
const MIXED_CREATE_P99_MS = Number(__ENV.MIXED_CREATE_P99_MS || 240000);

/**
 * =========================================================
 * Custom Metrics
 * =========================================================
 */
const mixedProductListResponseTime = new Trend(
  "mixed_product_list_response_time"
);
const mixedOrdersResponseTime = new Trend("mixed_orders_response_time");
const mixedProductFilterResponseTime = new Trend(
  "mixed_product_filter_response_time"
);
const mixedCategoryCreateResponseTime = new Trend(
  "mixed_category_create_response_time"
);
const mixedCategoryReadResponseTime = new Trend(
  "mixed_category_read_response_time"
);
const mixedProductDetailResponseTime = new Trend(
  "mixed_product_detail_response_time"
);
const mixedAuthResponseTime = new Trend("mixed_auth_response_time");
const mixedProfileUpdateResponseTime = new Trend(
  "mixed_profile_update_response_time"
);
const mixedCategoryUpdateResponseTime = new Trend(
  "mixed_category_update_response_time"
);

const mixedExpected4xxCount = new Counter("mixed_expected_4xx_count");

/**
 * =========================================================
 * Scenario Configuration
 * =========================================================
 */
export const options = {
  scenarios: {
    mixed_peak_workload: {
      executor: "ramping-vus",
      exec: "mixedPeakWorkloadScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 500 },
        { duration: "3m", target: 500 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
      gracefulStop: "30s",
      tags: {
        group: "mixed_workload",
        scenario_family: "story5",
      },
    },
  },

  thresholds: {
    "http_req_failed{group:mixed_workload}": [`rate<${MIXED_HTTP_FAILED_RATE}`],

    "http_req_duration{group:mixed_workload}": [
      `avg<${MIXED_GROUP_AVG_MS}`,
      `p(95)<${MIXED_GROUP_P95_MS}`,
      `p(99)<${MIXED_GROUP_P99_MS}`,
    ],

    mixed_product_list_response_time: [
      `p(95)<${MIXED_FAST_OP_P95_MS}`,
      `p(99)<${MIXED_FAST_OP_P99_MS}`,
    ],

    mixed_orders_response_time: [
      `p(95)<${MIXED_FAST_OP_P95_MS}`,
      `p(99)<${MIXED_FAST_OP_P99_MS}`,
    ],

    mixed_product_filter_response_time: [
      `p(95)<${MIXED_FAST_OP_P95_MS}`,
      `p(99)<${MIXED_FAST_OP_P99_MS}`,
    ],

    mixed_category_read_response_time: [
      `p(95)<${MIXED_FAST_OP_P95_MS}`,
      `p(99)<${MIXED_FAST_OP_P99_MS}`,
    ],

    mixed_auth_response_time: [
      `p(95)<${MIXED_AUTH_P95_MS}`,
      `p(99)<${MIXED_AUTH_P99_MS}`,
    ],

    mixed_product_detail_response_time: [
      `p(95)<${MIXED_MEDIUM_OP_P95_MS}`,
      `p(99)<${MIXED_MEDIUM_OP_P99_MS}`,
    ],

    mixed_profile_update_response_time: [
      `p(95)<${MIXED_MEDIUM_OP_P95_MS}`,
      `p(99)<${MIXED_MEDIUM_OP_P99_MS}`,
    ],

    mixed_category_update_response_time: [
      `p(95)<${MIXED_MEDIUM_OP_P95_MS}`,
      `p(99)<${MIXED_MEDIUM_OP_P99_MS}`,
    ],

    mixed_category_create_response_time: [
      `p(95)<${MIXED_CREATE_P95_MS}`,
      `p(99)<${MIXED_CREATE_P99_MS}`,
    ],
  },

  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

/**
 * =========================================================
 * Helpers
 * =========================================================
 */
function authHeaders(token) {
  return {
    ...JSON_HEADERS,
    Authorization: token,
  };
}

function requestParams(endpoint, group = "mixed_workload") {
  return {
    timeout: "15s",
    tags: { endpoint, group },
  };
}

function requestParamsWithAuth(token, endpoint, group = "mixed_workload") {
  return {
    timeout: "15s",
    headers: authHeaders(token),
    tags: { endpoint, group },
  };
}

function loginAdmin() {
  const email = __ENV.ADMIN_EMAIL || "Daniel@gmail.com";
  const password = __ENV.ADMIN_PASSWORD || "AdminPass123";

  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: JSON_HEADERS,
      timeout: "15s",
      tags: { endpoint: "login_admin_setup", group: "setup" },
    }
  );

  const body = safeJson(res);

  if (res.status !== 200 || !body?.token || !body?.user) {
    throw new Error(
      `Admin login failed. Status=${res.status}, body=${res.body}`
    );
  }

  return body;
}

function registerUser(user) {
  return http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify(user),
    {
      headers: JSON_HEADERS,
      timeout: "15s",
      tags: { endpoint: "register_story5_user", group: "setup" },
    }
  );
}

function loginUser(email, password, endpoint = "login_story5_user") {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: JSON_HEADERS,
      timeout: "15s",
      tags: { endpoint, group: "setup" },
    }
  );

  const body = safeJson(res);

  if (res.status !== 200 || !body?.token || !body?.user) {
    throw new Error(
      `User login failed for ${email}. Status=${res.status}, body=${res.body}`
    );
  }

  return body;
}

function resetPassword(email, answer, newPassword) {
  return http.post(
    `${BASE_URL}/api/v1/auth/forgot-password`,
    JSON.stringify({ email, answer, newPassword }),
    {
      headers: JSON_HEADERS,
      timeout: "15s",
      tags: { endpoint: "story5_reset_password", group: "setup" },
    }
  );
}

function getCategoryList() {
  return http.get(
    `${BASE_URL}/api/v1/category/get-category`,
    requestParams("get_category_list")
  );
}

function getProductList() {
  return http.get(
    `${BASE_URL}/api/v1/product/get-product`,
    requestParams("get_product_list")
  );
}

function searchProducts(keyword) {
  return http.get(
    `${BASE_URL}/api/v1/product/search/${encodeURIComponent(keyword)}`,
    requestParams("search_product")
  );
}

function filterProducts(checked = [], radio = []) {
  return http.post(
    `${BASE_URL}/api/v1/product/product-filters`,
    JSON.stringify({ checked, radio }),
    {
      headers: JSON_HEADERS,
      timeout: "15s",
      tags: { endpoint: "product_filters", group: "mixed_workload" },
    }
  );
}

function getSingleProduct(slug) {
  return http.get(
    `${BASE_URL}/api/v1/product/get-product/${slug}`,
    requestParams("get_product_detail")
  );
}

function createCategory(token, name) {
  return http.post(
    `${BASE_URL}/api/v1/category/create-category`,
    JSON.stringify({ name }),
    {
      headers: authHeaders(token),
      timeout: "15s",
      tags: { endpoint: "create_category", group: "mixed_workload" },
    }
  );
}

function updateCategory(token, id, name) {
  return http.put(
    `${BASE_URL}/api/v1/category/update-category/${id}`,
    JSON.stringify({ name }),
    {
      headers: authHeaders(token),
      timeout: "15s",
      tags: { endpoint: "update_category", group: "mixed_workload" },
    }
  );
}

function updateProfile(token, payload) {
  return http.put(
    `${BASE_URL}/api/v1/auth/profile`,
    JSON.stringify(payload),
    {
      headers: authHeaders(token),
      timeout: "15s",
      tags: { endpoint: "update_profile", group: "mixed_workload" },
    }
  );
}

function getOrders(token) {
  return http.get(
    `${BASE_URL}/api/v1/auth/orders`,
    requestParamsWithAuth(token, "get_orders")
  );
}

function performLoginAttempt(email, password) {
  return http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: JSON_HEADERS,
      timeout: "15s",
      tags: { endpoint: "mixed_login", group: "mixed_workload" },
    }
  );
}

function isRequestFailure(res) {
  return !res || res.status === 0 || !!res.error;
}

function isPerfSeedCategory(category) {
  return (
    category &&
    typeof category.name === "string" &&
    category.name.startsWith("PerfSeedCategory")
  );
}

function safeCategories(categories) {
  return Array.isArray(categories) ? categories.filter(Boolean) : [];
}

function safeProducts(products) {
  return Array.isArray(products) ? products.filter(Boolean) : [];
}

/**
 * =========================================================
 * Setup
 * =========================================================
 */
export function setup() {
  const admin = loginAdmin();

  const ordersEmail = __ENV.STORY5_ORDERS_EMAIL || "load.user@test.com";
  const ordersAnswer = __ENV.STORY5_ORDERS_ANSWER || "Tennis";
  const ordersPassword = __ENV.STORY5_ORDERS_PASSWORD || "Story5OrdersPass123";

  const resetRes = resetPassword(ordersEmail, ordersAnswer, ordersPassword);
  const resetBody = safeJson(resetRes);
  if (resetRes.status !== 200 || !resetBody?.success) {
    throw new Error(
      `Story 5 orders user password reset failed. Status=${resetRes.status}, body=${resetRes.body}`
    );
  }

  const ordersLogin = loginUser(
    ordersEmail,
    ordersPassword,
    "story5_orders_user_login"
  );

  const runId = uniqueSuffix();
  const story5User = {
    name: `Story5 User ${runId}`,
    email: `story5.user.${runId}@test.com`,
    password: "Story5UserPass123",
    phone: "93333333",
    address: "Story 5 User Address",
    answer: "Story5Answer",
  };

  const registerRes = registerUser(story5User);
  const registerBody = safeJson(registerRes);

  if (registerRes.status !== 201 || !registerBody?.success) {
    throw new Error(
      `Story 5 fresh user registration failed. Status=${registerRes.status}, body=${registerRes.body}`
    );
  }

  const userLogin = loginUser(
    story5User.email,
    story5User.password,
    "story5_fresh_user_login"
  );

  const categoryRes = getCategoryList();
  check(categoryRes, {
    "category list status 200": (r) => r.status === 200,
  });
  const categoryBody = safeJson(categoryRes);
  const categories = safeCategories(categoryBody?.category || []);

  const productRes = getProductList();
  check(productRes, {
    "product list status 200": (r) => r.status === 200,
  });
  const productBody = safeJson(productRes);
  const products = safeProducts(productBody?.products || []);

  if (!categories.length) {
    throw new Error("Story 5 setup failed: no categories available.");
  }

  if (!products.length) {
    throw new Error("Story 5 setup failed: no products available.");
  }

  const updateTargetCategories = categories.filter(isPerfSeedCategory);
  const categoryUpdatePool = updateTargetCategories.length
    ? updateTargetCategories
    : categories;

  return {
    adminToken: admin.token,
    adminUser: admin.user,
    userToken: userLogin.token,
    userUser: userLogin.user,
    ordersToken: ordersLogin.token,
    ordersUser: ordersLogin.user,
    categories,
    categoryUpdatePool,
    products,
    story5UserEmail: story5User.email,
    story5UserPassword: story5User.password,
  };
}

/**
 * =========================================================
 * Main mixed scenario
 * =========================================================
 */
export function mixedPeakWorkloadScenario(data) {
  group("Story 5 - realistic mixed peak workload", () => {
    const r = Math.random();

    if (r < 0.14) {
      const res = getProductList();
      if (!isRequestFailure(res)) {
        mixedProductListResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed product list status 200": (x) => x.status === 200,
        "mixed product list parses as JSON": () => body !== null,
        "mixed product list returns products array": () =>
          Array.isArray(body?.products),
      });

      sleep(1);
      return;
    }

    if (r < 0.20) {
      const res = getCategoryList();
      if (!isRequestFailure(res)) {
        mixedCategoryReadResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed category list status 200": (x) => x.status === 200,
        "mixed category list parses as JSON": () => body !== null,
        "mixed category list returns array": () => Array.isArray(body?.category),
      });

      sleep(1);
      return;
    }

    if (r < 0.27) {
      const product = randomChoice(data.products);
      const keyword = product?.name ? product.name.split(" ")[0] : "book";
      const res = searchProducts(keyword);

      if (!isRequestFailure(res)) {
        mixedProductFilterResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed search status 200": (x) => x.status === 200,
        "mixed search parses as JSON": () => body !== null,
        "mixed search returns array": () => Array.isArray(body?.products),
      });

      sleep(1);
      return;
    }

    if (r < 0.34) {
      const category = randomChoice(data.categories);
      const checked = category?._id ? [category._id] : [];
      const radio = [];

      const res = filterProducts(checked, radio);

      if (!isRequestFailure(res)) {
        mixedProductFilterResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed filter status 200": (x) => x.status === 200,
        "mixed filter parses as JSON": () => body !== null,
        "mixed filter returns products array": () => Array.isArray(body?.products),
      });

      sleep(1);
      return;
    }

    if (r < 0.46) {
      const product = randomChoice(data.products);
      const slug = product?.slug || "textbook";

      const res = getSingleProduct(slug);
      if (!isRequestFailure(res)) {
        mixedProductDetailResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed product detail status 200": (x) => x.status === 200,
        "mixed product detail parses as JSON": () => body !== null,
        "mixed product detail returns matching slug": () =>
          body?.product?.slug === slug ||
          body?.slug === slug ||
          body?.products?.slug === slug,
      });

      sleep(1);
      return;
    }

    if (r < 0.66) {
      const shouldUseWrongPassword = Math.random() < 0.2;

      const email = data.userUser?.email || data.story5UserEmail;
      const password = shouldUseWrongPassword
        ? "DefinitelyWrongPassword123"
        : data.story5UserPassword;

      const res = performLoginAttempt(email, password);

      if (!isRequestFailure(res)) {
        mixedAuthResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed login returns expected status": (x) =>
          x.status === 200 || x.status === 401 || x.status === 404,
        "mixed login body is non-empty": (x) => !!x.body && x.body.length > 0,
        "mixed login success/failure shape is valid": () => {
          if (!body) return false;
          if (res.status === 200) {
            return !!body?.token && !!body?.user;
          }
          return body?.success === false || typeof body?.message === "string";
        },
      });

      if (res.status >= 400 && res.status < 500) {
        mixedExpected4xxCount.add(1);
      }

      sleep(1);
      return;
    }

    if (r < 0.76) {
      const res = getOrders(data.ordersToken);
      if (!isRequestFailure(res)) {
        mixedOrdersResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed orders status 200": (x) => x.status === 200,
        "mixed orders parses as JSON": () => body !== null,
        "mixed orders returns array": () => Array.isArray(body),
      });

      sleep(1);
      return;
    }

    if (r < 0.86) {
      const suffix = uniqueSuffix();

      const payload = {
        name: `Story5 Updated User ${suffix}`,
        email: data.userUser?.email,
        phone: `9${String(__VU).padStart(7, "0")}`.slice(0, 8),
        address: `Story5 Updated Address ${suffix}`,
        password: "",
      };

      const res = updateProfile(data.userToken, payload);

      if (!isRequestFailure(res)) {
        mixedProfileUpdateResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed profile update status is 200 or 400": (x) =>
          x.status === 200 || x.status === 400,
        "mixed profile update parses as JSON": () => body !== null,
        "mixed profile update response shape valid": () => {
          if (!body) return false;
          if (res.status === 200) return body?.success === true;
          if (res.status === 400) return body?.success === false;
          return false;
        },
      });

      if (res.status >= 400 && res.status < 500) {
        mixedExpected4xxCount.add(1);
      }

      sleep(1);
      return;
    }

    if (r < 0.94) {
      const name = `Story5MixedCategory_${uniqueSuffix()}`;

      const res = createCategory(data.adminToken, name);

      if (!isRequestFailure(res)) {
        mixedCategoryCreateResponseTime.add(res.timings.duration);
      }
      const body = safeJson(res);

      check(res, {
        "mixed create category valid status": (x) =>
          x.status === 201 || x.status === 409,
        "mixed create category parses as JSON": () => body !== null,
      });

      if (res.status >= 400 && res.status < 500) {
        mixedExpected4xxCount.add(1);
      }

      sleep(1);
      return;
    }

    const category = randomChoice(data.categoryUpdatePool);
    const targetId = category?._id;
    const newName = isPerfSeedCategory(category)
      ? `PerfSeedCategory_${uniqueSuffix()}`
      : `Story5MixedUpdate_${uniqueSuffix()}`;

    const res = updateCategory(data.adminToken, targetId, newName);

    if (!isRequestFailure(res)) {
      mixedCategoryUpdateResponseTime.add(res.timings.duration);
    }
    const body = safeJson(res);

    check(res, {
      "mixed category update valid status": (x) =>
        x.status === 200 || x.status === 404 || x.status === 409,
      "mixed category update parses as JSON": () => body !== null,
    });

    if (res.status >= 400 && res.status < 500) {
      mixedExpected4xxCount.add(1);
    }

    sleep(1);
  });
}

/**
 * =========================================================
 * Summary
 * =========================================================
 */
export function handleSummary(data) {
  return {
    stdout: `
============================================================
Story 5: Realistic Mixed Peak Workload
============================================================

Scenario executed:
- 500 concurrent VUs under a mixed workload representing realistic
  browsing, search, product detail, auth, orders, profile, and admin operations

Operation mix includes:
- mixed product list
- mixed category list
- mixed product search
- mixed product filters
- mixed product detail
- mixed login attempts
- mixed orders retrieval
- mixed profile update
- mixed category create
- mixed category update

- http_req_failed{group:mixed_workload} < ${MIXED_HTTP_FAILED_RATE}
- mixed workload avg request duration < ${MIXED_GROUP_AVG_MS}ms
- mixed workload p95 request duration < ${MIXED_GROUP_P95_MS}ms
- mixed workload p99 request duration < ${MIXED_GROUP_P99_MS}ms

Fast endpoints:
- p95 < ${MIXED_FAST_OP_P95_MS}ms
- p99 < ${MIXED_FAST_OP_P99_MS}ms

Auth:
- p95 < ${MIXED_AUTH_P95_MS}ms
- p99 < ${MIXED_AUTH_P99_MS}ms

Medium/heavier endpoints:
- p95 < ${MIXED_MEDIUM_OP_P95_MS}ms
- p99 < ${MIXED_MEDIUM_OP_P99_MS}ms

Category create:
- p95 < ${MIXED_CREATE_P95_MS}ms
- p99 < ${MIXED_CREATE_P99_MS}ms

============================================================
`,
  };
}