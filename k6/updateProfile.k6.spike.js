// Teng Hui Xin Alicia, A0259064Y

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const API_BASE = "http://localhost:6060/api/v1";
const NUM_TEST_USERS = 150;

const profileUpdateErrors = new Counter("profile_update_errors");
const profileUpdateErrorRate = new Rate("profile_update_error_rate");
const profileUpdateDuration = new Trend("profile_update_duration", true);
const profileUpdateReqs = new Counter("profile_update_reqs");

export const options = {
  setupTimeout: "3m",

  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],

  stages: [
    { duration: "10s", target: 10 },   // baseline
    { duration: "20s", target: 150 },  // spike
    { duration: "30s", target: 150 },  // hold peak
    { duration: "20s", target: 0 },    // recovery
  ],

  thresholds: {
    "http_req_duration{endpoint:update-profile}": ["p(90)<3000"],
    "http_req_failed{endpoint:update-profile}": ["rate<0.05"],
    profile_update_error_rate: ["rate<0.02"],
  },
};

// Create users and log them in first so the spike phase can focus on profile updates
export function setup() {
  console.log(`[setup] Creating ${NUM_TEST_USERS} profile update test users...`);
  const userPool = [];

  for (let i = 1; i <= NUM_TEST_USERS; i++) {
    const email = `profilespike_${i}@ecommerce.test`;
    const password = "password123";

    http.post(
      `${API_BASE}/auth/register`,
      JSON.stringify({
        name: `Profile Spike User ${i}`,
        email,
        password,
        phone: "99126299",
        address: "Original Address",
        answer: "IloveNFT",
        DOB: "2000-01-01",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const loginRes = http.post(
      `${API_BASE}/auth/login`,
      JSON.stringify({ email, password }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (loginRes.status === 200) {
      userPool.push({
        token: loginRes.json().token,
        email,
        password,
      });
    }
  }

  console.log(`[setup] Pre-logged in ${userPool.length} users.`);
  return { userPool };
}

export default function (data) {
  const validUsers = (data.userPool || []).filter((u) => u && u.token);

  if (validUsers.length === 0) {
    console.warn("No valid users available — skipping iteration");
    sleep(1);
    return;
  }

  const currentUser = validUsers[Math.floor(Math.random() * validUsers.length)];

  const updatePayload = {
    name: `Updated User ${__VU}_${__ITER}`,
    email: currentUser.email,
    password: currentUser.password,
    phone: `9${String((__VU * 1000 + __ITER) % 10000000).padStart(7, "0")}`,
    address: `Updated Address ${__VU}_${__ITER}`,
    answer: "IloveNFT",
  };

  const updateRes = http.put(
    `${API_BASE}/auth/profile`,
    JSON.stringify(updatePayload),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: currentUser.token,
      },
      tags: { endpoint: "update-profile" },
    }
  );

  profileUpdateReqs.add(1);
  profileUpdateDuration.add(updateRes.timings.duration);

  let updateJson;
  try {
    updateJson = updateRes.json();
  } catch (_) {}

  const updateOk = check(updateRes, {
    "profile-update: status 200": (r) => r.status === 200,
    "profile-update: returns object": () =>
      updateJson !== null && typeof updateJson === "object",
  });

  profileUpdateErrorRate.add(!updateOk);
  if (!updateOk) profileUpdateErrors.add(1);

  sleep(Math.random() * 1.0 + 0.5);
}

export function handleSummary(data) {
  const reqs = data.metrics.profile_update_reqs
    ? data.metrics.profile_update_reqs.values.count
    : 0;

  const durationSecs =
    data.state && data.state.testRunDurationMs
      ? data.state.testRunDurationMs / 1000
      : 1;

  const rps = (reqs / durationSecs).toFixed(2);

  const updateMetric = data.metrics.profile_update_duration;
  const updateErrMetric = data.metrics.profile_update_error_rate;

  const updateP90 =
    updateMetric && updateMetric.values["p(90)"] !== undefined
      ? updateMetric.values["p(90)"].toFixed(2) + " ms"
      : "N/A";

  const err =
    updateErrMetric && updateErrMetric.values.rate !== undefined
      ? (updateErrMetric.values.rate * 100).toFixed(2) + " %"
      : "N/A";

  let customTable = "\n=================================================================================\n";
  customTable += " Flow              |   Avg RPS   | p90 Response | Profile Update Error Rate\n";
  customTable += "---------------------------------------------------------------------------------\n";
  customTable += ` Update Profile    | ${rps.padStart(11)} | ${updateP90.padStart(12)} | ${err.padStart(26)}\n`;
  customTable += "=================================================================================\n\n";

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable,
  };
}