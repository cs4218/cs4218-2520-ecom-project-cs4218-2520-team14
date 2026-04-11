// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { BASE_URL, JSON_HEADERS } from "./config.js";
import { uniqueSuffix, safeJson } from "./utils.js";


const PROFILE_PROXY_AVG_MS = Number(__ENV.PROFILE_PROXY_AVG_MS || 50);
const PROFILE_UPDATE_AVG_MS = Number(__ENV.PROFILE_UPDATE_AVG_MS || 2600);
const ORDERS_READ_AVG_MS = Number(__ENV.ORDERS_READ_AVG_MS || 1400);

const PROFILE_PROXY_P95_MS = Number(__ENV.PROFILE_PROXY_P95_MS || 100);
const PROFILE_UPDATE_P95_MS = Number(__ENV.PROFILE_UPDATE_P95_MS || 4200);
const ORDERS_READ_P95_MS = Number(__ENV.ORDERS_READ_P95_MS || 2200);

/**
 * =========================================================
 * Custom Metrics
 * =========================================================
 */
const userProfileOrdersSuccessRate = new Rate(
  "user_profile_orders_success_rate"
);
const userProfileOrdersPayloadIntegrityRate = new Rate(
  "user_profile_orders_payload_integrity_rate"
);
const userProfileOrdersServerErrorRate = new Rate(
  "user_profile_orders_server_error_rate"
);

const profileProxyResponseTrend = new Trend("profile_proxy_response_time");
const profileUpdateResponseTrend = new Trend("profile_update_response_time");
const ordersReadResponseTrend = new Trend("orders_read_response_time");

const malformedUserPayloadCount = new Counter("malformed_user_payload_count");
const unexpectedCrossUserDataCount = new Counter(
  "unexpected_cross_user_data_count"
);
const profileUpdateValidationErrorCount = new Counter(
  "profile_update_validation_error_count"
);
const userRequestFailureCount = new Counter("user_request_failure_count");

/**
 * =========================================================
 * Scenario Configuration
 * =========================================================
 */
export const options = {
  scenarios: {
    profile_proxy_read: {
      executor: "ramping-vus",
      exec: "profileProxyScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "3m", target: 200 },
        { duration: "30s", target: 0 },
      ],
      tags: {
        endpoint_family: "profile_proxy",
        group: "user_profile_orders",
      },
    },

    profile_update: {
      executor: "ramping-vus",
      exec: "profileUpdateScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 100 },
        { duration: "3m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      tags: {
        endpoint_family: "profile_update",
        group: "user_profile_orders",
      },
    },

    orders_read: {
      executor: "ramping-vus",
      exec: "ordersReadScenario",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "3m", target: 200 },
        { duration: "30s", target: 0 },
      ],
      tags: {
        endpoint_family: "orders_read",
        group: "user_profile_orders",
      },
    },
  },

  thresholds: {
    "http_req_failed{group:user_profile_orders}": ["rate==0"],

    "http_req_failed{endpoint:get_profile_page_proxy}": ["rate==0"],
    "http_req_failed{endpoint:update_profile}": ["rate==0"],
    "http_req_failed{endpoint:get_orders}": ["rate==0"],

    "http_req_duration{endpoint:get_profile_page_proxy}": [
      `avg<${PROFILE_PROXY_AVG_MS}`,
      `p(95)<${PROFILE_PROXY_P95_MS}`,
    ],
    "http_req_duration{endpoint:update_profile}": [
      `avg<${PROFILE_UPDATE_AVG_MS}`,
      `p(95)<${PROFILE_UPDATE_P95_MS}`,
    ],
    "http_req_duration{endpoint:get_orders}": [
      `avg<${ORDERS_READ_AVG_MS}`,
      `p(95)<${ORDERS_READ_P95_MS}`,
    ],

    user_profile_orders_success_rate: ["rate>0.98"],
    user_profile_orders_payload_integrity_rate: ["rate>0.98"],
    user_profile_orders_server_error_rate: ["rate==0"],

    profile_proxy_response_time: [
      `avg<${PROFILE_PROXY_AVG_MS}`,
      `p(95)<${PROFILE_PROXY_P95_MS}`,
    ],
    profile_update_response_time: [
      `avg<${PROFILE_UPDATE_AVG_MS}`,
      `p(95)<${PROFILE_UPDATE_P95_MS}`,
    ],
    orders_read_response_time: [
      `avg<${ORDERS_READ_AVG_MS}`,
      `p(95)<${ORDERS_READ_P95_MS}`,
    ],
  },

  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

/**
 * =========================================================
 * Helper functions
 * =========================================================
 */
function authHeaders(token) {
  return {
    ...JSON_HEADERS,
    Authorization: token,
  };
}

function isRequestFailure(res) {
  return !res || res.status === 0 || !!res.error;
}

function registerUser(user) {
  return http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify(user), {
    headers: JSON_HEADERS,
    tags: { endpoint: "register_setup_user", group: "story4_setup" },
    timeout: "15s",
  });
}

function loginUser(email, password, endpointTag = "login_setup_user") {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: JSON_HEADERS,
      tags: { endpoint: endpointTag, group: "story4_setup" },
      timeout: "15s",
    }
  );

  const body = safeJson(res);

  if (res.status !== 200 || !body?.token || !body?.user) {
    throw new Error(
      `Login failed for ${email}. Status=${res.status}, body=${res.body}`
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
      tags: { endpoint: "forgot_password_setup_user", group: "story4_setup" },
      timeout: "15s",
    }
  );
}

function getProfileProxy(token) {
  return http.get(`${BASE_URL}/api/v1/auth/user-auth`, {
    headers: authHeaders(token),
    tags: {
      endpoint: "get_profile_page_proxy",
      group: "user_profile_orders",
    },
    timeout: "15s",
  });
}

function updateProfile(token, payload) {
  return http.put(`${BASE_URL}/api/v1/auth/profile`, JSON.stringify(payload), {
    headers: authHeaders(token),
    tags: {
      endpoint: "update_profile",
      group: "user_profile_orders",
    },
    timeout: "15s",
  });
}

function getOrders(token) {
  return http.get(`${BASE_URL}/api/v1/auth/orders`, {
    headers: authHeaders(token),
    tags: {
      endpoint: "get_orders",
      group: "user_profile_orders",
    },
    timeout: "15s",
  });
}

/**
 * =========================================================
 * Setup
 * =========================================================
 */
export function setup() {
  const runId = uniqueSuffix();

  const profileUser = {
    name: `Story4 Profile User ${runId}`,
    email: `story4.profile.${runId}@test.com`,
    password: "Story4Pass123",
    phone: "93333333",
    address: "Story 4 Profile Address",
    answer: "Story4Answer",
  };

  const registerRes = registerUser(profileUser);
  const registerBody = safeJson(registerRes);

  if (registerRes.status !== 201 || !registerBody?.success) {
    throw new Error(
      `Failed to create fresh Story 4 profile user. Status=${registerRes.status}, body=${registerRes.body}`
    );
  }

  const profileLogin = loginUser(
    profileUser.email,
    profileUser.password,
    "login_profile_setup_user"
  );

  const ordersUserEmail = __ENV.STORY4_ORDERS_EMAIL || "load.user@test.com";
  const ordersUserAnswer = __ENV.STORY4_ORDERS_ANSWER || "Tennis";
  const ordersUserResetPassword =
    __ENV.STORY4_ORDERS_PASSWORD || "Story4OrdersPass123";

  const resetRes = resetPassword(
    ordersUserEmail,
    ordersUserAnswer,
    ordersUserResetPassword
  );
  const resetBody = safeJson(resetRes);

  if (resetRes.status !== 200 || !resetBody?.success) {
    throw new Error(
      `Failed to reset seeded orders user password. Status=${resetRes.status}, body=${resetRes.body}`
    );
  }

  const ordersLogin = loginUser(
    ordersUserEmail,
    ordersUserResetPassword,
    "login_orders_setup_user"
  );

  return {
    profileUser: {
      email: profileUser.email,
      password: profileUser.password,
      name: profileUser.name,
      phone: profileUser.phone,
      address: profileUser.address,
      token: profileLogin.token,
      userId: profileLogin.user?._id,
    },
    ordersUser: {
      email: ordersUserEmail,
      password: ordersUserResetPassword,
      answer: ordersUserAnswer,
      token: ordersLogin.token,
      userId: ordersLogin.user?._id,
    },
  };
}

/**
 * =========================================================
 * Scenario 1: Profile/session proxy read
 * =========================================================
 */
export function profileProxyScenario(data) {
  group("Story 4 - profile/session proxy read", () => {
    const res = getProfileProxy(data.profileUser.token);

    if (isRequestFailure(res)) {
      userRequestFailureCount.add(1);
      userProfileOrdersSuccessRate.add(false);
      userProfileOrdersPayloadIntegrityRate.add(false);
      userProfileOrdersServerErrorRate.add(true);
      sleep(1);
      return;
    }

    profileProxyResponseTrend.add(res.timings.duration);
    userProfileOrdersServerErrorRate.add(res.status >= 500);

    const body = safeJson(res);

    const checksPassed = check(res, {
      "profile proxy status is 200": (r) => r.status === 200,
      "profile proxy body is non-empty": (r) => !!r.body && r.body.length > 0,
      "profile proxy parses as JSON": () => body !== null,
      "profile proxy success true": () =>
        body?.ok === true || body?.success === true,
    });

    if (body === null) {
      malformedUserPayloadCount.add(1);
    }

    if (body?.user?.email && body.user.email !== data.profileUser.email) {
      unexpectedCrossUserDataCount.add(1);
    }

    const payloadIntegrityOk =
      body !== null && (body?.ok === true || body?.success === true);

    userProfileOrdersSuccessRate.add(checksPassed);
    userProfileOrdersPayloadIntegrityRate.add(payloadIntegrityOk);

    sleep(1);
  });
}

/**
 * =========================================================
 * Scenario 2: Profile update
 * =========================================================
 */
export function profileUpdateScenario(data) {
  group("Story 4 - profile update", () => {
    const suffix = uniqueSuffix();

    const payload = {
      name: `Updated Story4 User ${suffix}`,
      email: data.profileUser.email,
      phone: `9${String(__VU).padStart(7, "0")}`.slice(0, 8),
      address: `Updated Address ${suffix}`,
      password: "",
    };

    const res = updateProfile(data.profileUser.token, payload);

    if (isRequestFailure(res)) {
      userRequestFailureCount.add(1);
      userProfileOrdersSuccessRate.add(false);
      userProfileOrdersPayloadIntegrityRate.add(false);
      userProfileOrdersServerErrorRate.add(true);
      sleep(1);
      return;
    }

    profileUpdateResponseTrend.add(res.timings.duration);
    userProfileOrdersServerErrorRate.add(res.status >= 500);

    const body = safeJson(res);

    const checksPassed = check(res, {
      "profile update status is 200 or 400": (r) =>
        r.status === 200 || r.status === 400,
      "profile update body is non-empty": (r) => !!r.body && r.body.length > 0,
      "profile update parses as JSON": () => body !== null,
      "profile update response shape valid": () => {
        if (!body) return false;

        if (res.status === 200) {
          return body?.success === true;
        }

        if (res.status === 400) {
          return body?.success === false;
        }

        return false;
      },
    });

    if (res.status === 400) {
      profileUpdateValidationErrorCount.add(1);
    }

    if (body === null) {
      malformedUserPayloadCount.add(1);
    }

    if (
      body?.updatedUser?.email &&
      body.updatedUser.email !== data.profileUser.email
    ) {
      unexpectedCrossUserDataCount.add(1);
    }

    const payloadIntegrityOk =
      body !== null &&
      ((res.status === 200 && body?.success === true) ||
        (res.status === 400 && body?.success === false));

    userProfileOrdersSuccessRate.add(checksPassed);
    userProfileOrdersPayloadIntegrityRate.add(payloadIntegrityOk);

    sleep(1);
  });
}

/**
 * =========================================================
 * Scenario 3: Orders retrieval
 * =========================================================
 */
export function ordersReadScenario(data) {
  group("Story 4 - orders retrieval", () => {
    const res = getOrders(data.ordersUser.token);

    if (isRequestFailure(res)) {
      userRequestFailureCount.add(1);
      userProfileOrdersSuccessRate.add(false);
      userProfileOrdersPayloadIntegrityRate.add(false);
      userProfileOrdersServerErrorRate.add(true);
      sleep(1);
      return;
    }

    ordersReadResponseTrend.add(res.timings.duration);
    userProfileOrdersServerErrorRate.add(res.status >= 500);

    const body = safeJson(res);

    const checksPassed = check(res, {
      "orders status is 200": (r) => r.status === 200,
      "orders body is non-empty": (r) => !!r.body && r.body.length > 0,
      "orders parses as JSON": () => body !== null,
      "orders returns array": () => Array.isArray(body),
      "orders items are objects only": () =>
        Array.isArray(body) ? body.every((o) => typeof o === "object") : false,
    });

    if (body === null) {
      malformedUserPayloadCount.add(1);
    }

    if (Array.isArray(body)) {
      const crossUserOrder = body.some((order) => {
        const buyer = order?.buyer;
        if (!buyer) return false;
        if (typeof buyer === "string") {
          return buyer !== data.ordersUser.userId;
        }
        if (typeof buyer === "object" && buyer?._id) {
          return buyer._id !== data.ordersUser.userId;
        }
        return false;
      });

      if (crossUserOrder) {
        unexpectedCrossUserDataCount.add(1);
      }
    }

    const payloadIntegrityOk = body !== null && Array.isArray(body);

    userProfileOrdersSuccessRate.add(checksPassed);
    userProfileOrdersPayloadIntegrityRate.add(payloadIntegrityOk);

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
Story 4: User Profile and Order Retrieval Under Concurrent Load
============================================================

Scenarios executed:
- 200 concurrent authenticated users performing profile/session proxy checks
- 100 concurrent authenticated users updating profile details
- 200 concurrent authenticated users fetching order history

Key custom metrics:
- user_profile_orders_success_rate
- user_profile_orders_payload_integrity_rate
- user_profile_orders_server_error_rate
- profile_proxy_response_time
- profile_update_response_time
- orders_read_response_time
- malformed_user_payload_count
- unexpected_cross_user_data_count
- profile_update_validation_error_count
- user_request_failure_count

Interpretation guidance:
- malformed_user_payload_count should remain 0
- user_profile_orders_server_error_rate should remain 0
- unexpected_cross_user_data_count should remain 0
- user_profile_orders_payload_integrity_rate should remain close to 1.00
- profile_update_validation_error_count should remain low and should not reflect server instability
- user_request_failure_count should remain 0

Important design note:
- Because there is no dedicated GET /profile endpoint in the current backend,
  /api/v1/auth/user-auth is used as an authenticated session/profile-access proxy.
- Story 4 setup creates a fresh profile user per run and resets the seeded orders user password to avoid stale shared credentials.
============================================================
`,
  };
}