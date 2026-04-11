// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { BASE_URL, JSON_HEADERS } from "./config.js";
import { uniqueSuffix, safeJson } from "./utils.js";

/**
 * Custom metrics for richer analysis
 */
const authSuccessRate = new Rate("auth_success_rate");
const authPayloadIntegrityRate = new Rate("auth_payload_integrity_rate");
const authServerErrorRate = new Rate("auth_server_error_rate");

const loginResponseTrend = new Trend("auth_login_response_time");
const registerResponseTrend = new Trend("auth_register_response_time");
const forgotPasswordResponseTrend = new Trend(
  "auth_forgot_password_response_time"
);

const duplicateRegisterConflictCount = new Counter(
  "auth_duplicate_register_conflict_count"
);
const duplicateRegisterUnexpectedSuccessCount = new Counter(
  "auth_duplicate_register_unexpected_success_count"
);


const LOGIN_AVG_MS = Number(__ENV.LOGIN_AVG_MS || 500);
const REGISTER_AVG_MS = Number(__ENV.REGISTER_AVG_MS || 1050);
const AUTH_P95_MS = Number(__ENV.AUTH_P95_MS || 1500);

export const options = {
  scenarios: {
    login_sustained_load: {
      executor: "constant-vus",
      exec: "loginScenario",
      vus: 50,
      duration: "2m",
      tags: { endpoint: "login", group: "auth_load" },
    },

    register_unique_sustained_load: {
      executor: "constant-vus",
      exec: "registerUniqueScenario",
      vus: 30,
      duration: "2m",
      tags: { endpoint: "register", group: "auth_load" },
    },

    forgot_password_sustained_load: {
      executor: "constant-vus",
      exec: "forgotPasswordScenario",
      vus: 30,
      duration: "2m",
      tags: { endpoint: "forgot_password", group: "auth_load" },
    },

    duplicate_registration_collision_check: {
      executor: "constant-vus",
      exec: "duplicateRegisterScenario",
      vus: 15,
      duration: "45s",
      startTime: "15s",
      tags: {
        endpoint: "register_duplicate",
        group: "auth_duplicate_collision",
      },
    },
  },

  thresholds: {
    "http_req_failed{group:auth_load}": ["rate==0"],

    "http_req_failed{endpoint:login}": ["rate==0"],
    "http_req_failed{endpoint:register}": ["rate==0"],
    "http_req_failed{endpoint:forgot_password}": ["rate==0"],

    "http_req_duration{endpoint:login}": [
      `avg<${LOGIN_AVG_MS}`,
      `p(95)<${AUTH_P95_MS}`,
    ],
    "http_req_duration{endpoint:register}": [
      `avg<${REGISTER_AVG_MS}`,
      `p(95)<${AUTH_P95_MS}`,
    ],
    "http_req_duration{endpoint:forgot_password}": [`p(95)<${AUTH_P95_MS}`],

    auth_success_rate: ["rate>0.95"],
    auth_payload_integrity_rate: ["rate>0.99"],
    auth_server_error_rate: ["rate==0"],

    auth_login_response_time: [
      `avg<${LOGIN_AVG_MS}`,
      `p(95)<${AUTH_P95_MS}`,
    ],
    auth_register_response_time: [
      `avg<${REGISTER_AVG_MS}`,
      `p(95)<${AUTH_P95_MS}`,
    ],
    auth_forgot_password_response_time: [`p(95)<${AUTH_P95_MS}`],

    "http_req_failed{group:auth_duplicate_collision}": ["rate==1"],
    "http_req_failed{endpoint:register_duplicate}": ["rate==1"],
    auth_duplicate_register_unexpected_success_count: ["count==0"],
  },

  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export function setup() {
  const runId = uniqueSuffix();

  const seededLoginUser = {
    name: `Load Login User ${runId}`,
    email: `load.login.${runId}@test.com`,
    password: "UserPass123",
    phone: "81111111",
    address: "Load Login Address",
    answer: "Tennis",
  };

  const seededForgotUser = {
    name: `Load Forgot User ${runId}`,
    email: `load.forgot.${runId}@test.com`,
    password: "ForgotPass123",
    phone: "82222222",
    address: "Load Forgot Address",
    answer: "Football",
  };

  const duplicateUser = {
    name: `Duplicate Register Load User ${runId}`,
    email: `duplicate.load.${runId}@test.com`,
    password: "DuplicatePass123",
    phone: "90000000",
    address: "Duplicate Address",
    answer: "DuplicateAnswer",
  };

  const seedUsers = [seededLoginUser, seededForgotUser, duplicateUser];

  for (const user of seedUsers) {
    const payload = JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
      address: user.address,
      answer: user.answer,
    });

    const res = http.post(`${BASE_URL}/api/v1/auth/register`, payload, {
      headers: JSON_HEADERS,
      tags: { endpoint: "register_seed", group: "auth_setup" },
    });

    if (res.status !== 201) {
      throw new Error(
        `Failed to prepare seed user ${user.email}. Status=${res.status}, body=${res.body}`
      );
    }
  }

  return {
    seededLoginUser,
    seededForgotUser,
    duplicateUser,
  };
}

export function loginScenario(data) {
  group("Story 1 - login under concurrent sustained load", () => {
    const payload = JSON.stringify({
      email: data.seededLoginUser.email,
      password: data.seededLoginUser.password,
    });

    const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
      headers: JSON_HEADERS,
      tags: { endpoint: "login", group: "auth_load" },
    });

    loginResponseTrend.add(res.timings.duration);

    const body = safeJson(res);

    const responseChecks = check(res, {
      "login status is 200": (r) => r.status === 200,
      "login response body is non-empty": (r) => !!r.body && r.body.length > 0,
      "login response parses as JSON": () => body !== null,
      "login success is true": () => body?.success === true,
      "login message is correct": () => body?.message === "login successfully",
      "login includes token": () =>
        typeof body?.token === "string" && body.token.length > 0,
      "login includes user object": () => !!body?.user,
      "login includes user email": () =>
        body?.user?.email === data.seededLoginUser.email,
      "login does not expose password": () =>
        body?.user?.password === undefined,
    });

    authSuccessRate.add(responseChecks);
    authPayloadIntegrityRate.add(
      body !== null &&
        body?.success === true &&
        typeof body?.token === "string" &&
        !!body?.user &&
        body?.user?.email === data.seededLoginUser.email &&
        body?.user?.password === undefined
    );
    authServerErrorRate.add(res.status >= 500);

    sleep(1);
  });
}

export function registerUniqueScenario() {
  group("Story 1 - registration with unique concurrent users", () => {
    const suffix = uniqueSuffix();

    const user = {
      name: `Load Register User ${suffix}`,
      email: `load_register_${__VU}_${__ITER}_${suffix}@test.com`,
      password: "LoadPass123",
      phone: `9${String(__VU).padStart(7, "0")}`.slice(0, 8),
      address: `Load Address ${suffix}`,
      answer: `Answer_${suffix}`,
    };

    const res = http.post(
      `${BASE_URL}/api/v1/auth/register`,
      JSON.stringify(user),
      {
        headers: JSON_HEADERS,
        tags: { endpoint: "register", group: "auth_load" },
      }
    );

    registerResponseTrend.add(res.timings.duration);

    const body = safeJson(res);

    const responseChecks = check(res, {
      "register status is 201": (r) => r.status === 201,
      "register response body is non-empty": (r) =>
        !!r.body && r.body.length > 0,
      "register parses as JSON": () => body !== null,
      "register success is true": () => body?.success === true,
      "register message is correct": () =>
        body?.message === "User Register Successfully",
      "register includes user object": () => !!body?.user,
      "register returned email matches request": () =>
        body?.user?.email === user.email,
      "register returned name matches request": () =>
        body?.user?.name === user.name,
      "register response does not expose password": () =>
        body?.user?.password === undefined,
    });

    authSuccessRate.add(responseChecks);
    authPayloadIntegrityRate.add(
      body !== null &&
        body?.success === true &&
        body?.user?.email === user.email &&
        body?.user?.name === user.name &&
        body?.user?.password === undefined
    );
    authServerErrorRate.add(res.status >= 500);

    sleep(1);
  });
}

export function forgotPasswordScenario(data) {
  group("Story 1 - forgot-password under concurrent sustained load", () => {
    const newPassword = `Reset_${__VU}_${__ITER}_${Math.floor(
      Math.random() * 100000
    )}`;

    const payload = JSON.stringify({
      email: data.seededForgotUser.email,
      answer: data.seededForgotUser.answer,
      newPassword,
    });

    const res = http.post(`${BASE_URL}/api/v1/auth/forgot-password`, payload, {
      headers: JSON_HEADERS,
      tags: { endpoint: "forgot_password", group: "auth_load" },
    });

    forgotPasswordResponseTrend.add(res.timings.duration);

    const body = safeJson(res);

    const responseChecks = check(res, {
      "forgot-password status is 200": (r) => r.status === 200,
      "forgot-password body is non-empty": (r) =>
        !!r.body && r.body.length > 0,
      "forgot-password parses as JSON": () => body !== null,
      "forgot-password success is true": () => body?.success === true,
      "forgot-password message is correct": () =>
        body?.message === "Password Reset Successfully",
    });

    authSuccessRate.add(responseChecks);
    authPayloadIntegrityRate.add(
      body !== null &&
        body?.success === true &&
        body?.message === "Password Reset Successfully"
    );
    authServerErrorRate.add(res.status >= 500);

    sleep(1);
  });
}

export function duplicateRegisterScenario(data) {
  group("Story 1 - duplicate registration collision protection", () => {
    const payload = JSON.stringify({
      name: data.duplicateUser.name,
      email: data.duplicateUser.email,
      password: data.duplicateUser.password,
      phone: data.duplicateUser.phone,
      address: data.duplicateUser.address,
      answer: data.duplicateUser.answer,
    });

    const res = http.post(`${BASE_URL}/api/v1/auth/register`, payload, {
      headers: JSON_HEADERS,
      tags: {
        endpoint: "register_duplicate",
        group: "auth_duplicate_collision",
      },
    });

    registerResponseTrend.add(res.timings.duration);

    const body = safeJson(res);

    const responseChecks = check(res, {
      "duplicate registration returns 409": (r) => r.status === 409,
      "duplicate registration parses as JSON": () => body !== null,
      "duplicate registration success is false": () =>
        body?.success === false,
      "duplicate registration message is correct": () =>
        body?.message === "Already Register please login",
    });

    if (res.status === 409) {
      duplicateRegisterConflictCount.add(1);
    }
    if (res.status === 201) {
      duplicateRegisterUnexpectedSuccessCount.add(1);
    }

    authSuccessRate.add(responseChecks);
    authPayloadIntegrityRate.add(
      body !== null &&
        body?.success === false &&
        body?.message === "Already Register please login"
    );
    authServerErrorRate.add(res.status >= 500);

    sleep(1);
  });
}

export function handleSummary(data) {
  return {
    stdout: `
============================================================
Story 1: Authentication Endpoints Under Concurrent Load
============================================================

Scenarios executed:
- 50 concurrent login users for 2 minutes
- 30 concurrent unique registration users for 2 minutes
- 30 concurrent forgot-password users for 2 minutes
- duplicate registration collision validation

Key custom metrics:
- auth_success_rate
- auth_payload_integrity_rate
- auth_server_error_rate
- auth_login_response_time
- auth_register_response_time
- auth_forgot_password_response_time
- auth_duplicate_register_conflict_count
- auth_duplicate_register_unexpected_success_count

Important interpretation notes:
- duplicate registration scenario is expected to produce 409 Conflict, not 201.
- duplicate 409 responses are validated separately and excluded from the main happy-path auth failure thresholds.
- login and forgot-password use different seeded accounts so one scenario does not invalidate another.
- any HTTP 5xx response indicates server instability under load and should be treated as failure.
- login payload correctness checks ensure no corrupted or empty auth responses are returned.

Review the threshold results above for:
- avg login < ${LOGIN_AVG_MS}ms
- avg register < ${REGISTER_AVG_MS}ms
- p95 all happy-path auth endpoints < ${AUTH_P95_MS}ms
- zero 5xx server errors
- zero unexpected duplicate-registration successes
============================================================
`,
  };
}