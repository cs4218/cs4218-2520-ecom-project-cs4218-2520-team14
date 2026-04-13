import { sleep } from "k6";
import http from "k6/http";
import { Counter } from "k6/metrics";

import {
  loginUser,
  registerUser,
  updateUserProfile,
  userErrorRate,
  userLoginDuration,
  userRegisterDuration,
  userUpdateProfileDuration,
} from "../flows/users.js";

userRegisterDuration;
userLoginDuration;
userUpdateProfileDuration;
userErrorRate;

const usersInserted = new Counter("users_inserted");

export const options = {
  scenarios: {
    // Scenario 1: Data loader, progressively inserts more users each iteration
    user_loader: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 40,
      maxDuration: "3m",
      exec: "userLoader",
    },

    // Scenario 2: Simulated user actions like logging in and updating profile
    user_simulation: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "60s", target: 20 },
        { duration: "120s", target: 40 },
      ],
      exec: "userUserFlow",
    },
  },

  thresholds: {
    user_register_duration: ["p(95)<2000"],
    user_login_duration: ["p(95)<2000"], // bcrypt compare, need to watch this under volume
    user_update_profile_duration: ["p(95)<2000"],
    user_error_rate: ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

export function setup() {
  const res = http.post(
    "http://localhost:6060/api/v1/auth/login",
    JSON.stringify({
      email: __ENV.ADMIN_EMAIL,
      password: __ENV.ADMIN_PASSWORD,
    }),
    { headers: { "Content-Type": "application/json" } },
  );

  const token = res.json("token");

  return { token };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — User Loader
//
// Registers 25 × (iter + 1) users per iteration.
// Each user is distinct, no auth required
// ─────────────────────────────────────────────────────────────────────────────
export function userLoader() {
  const headers = { "Content-Type": "application/json" };
  const iter = __ITER;
  const batchSize = 25 * (iter + 1);

  for (let i = 0; i < batchSize; i++) {
    const created = registerUser(headers, __VU, `${iter}_${i}`);

    if (created) {
      usersInserted.add(1);
    }
  }

  sleep(3);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Simulated User Flow
//
// Simulates a logged-in user:
//   1. Login
//   2. Update profile
//
// Uses the pre-seeded account from setup() for updateProfile (needs auth).
// Login is re-attempted each iteration to measure its cost under volume.
// ─────────────────────────────────────────────────────────────────────────────
export function userUserFlow({ token }) {
  const publicHeaders = { "Content-Type": "application/json" };
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Step 1: Login
  loginUser(publicHeaders, __ENV.ADMIN_EMAIL, __ENV.ADMIN_PASSWORD);

  // Step 2: Update profile — authenticated write under a growing collection
  updateUserProfile(authHeaders, __VU, __ITER);

  sleep(1);
}
