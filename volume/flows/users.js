import { check } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

export const userRegisterDuration = new Trend("user_register_duration");
export const userLoginDuration = new Trend("user_login_duration");
export const userUpdateProfileDuration = new Trend(
  "user_update_profile_duration",
);
export const userErrorRate = new Rate("user_error_rate");

const BASE_URL = "http://localhost:6060/api/v1/auth";

export function registerUser(headers, vu, iter) {
  const unique = `${vu}_${iter}_${Date.now()}`;

  const res = http.post(
    `${BASE_URL}/register`,
    JSON.stringify({
      name: `Volume User ${unique}`,
      email: `voluser_${unique}@test.com`,
      password: "TestPass123!",
      phone: "91234567",
      address: "Volume Test Street, Singapore",
      answer: "volume", // security question answer — required field
    }),
    { headers },
  );

  userRegisterDuration.add(res.timings.duration);

  const ok = check(res, {
    "[register_user] status 201": (r) => r.status === 201,
    "[register_user] success is true": (r) => r.json("success") === true,
    "[register_user] has _id": (r) => r.json("user._id") !== undefined,
    "[register_user] has email": (r) => r.json("user.email") !== undefined,
    "[register_user] under 2s": (r) => r.timings.duration < 2000,
  });

  userErrorRate.add(!ok);
  return ok ? res.json("user") : null;
}

export function loginUser(headers, email, password) {
  const res = http.post(
    `${BASE_URL}/login`,
    JSON.stringify({ email, password }),
    { headers },
  );

  userLoginDuration.add(res.timings.duration);

  const ok = check(res, {
    "[login_user] status 200": (r) => r.status === 200,
    "[login_user] success is true": (r) => r.json("success") === true,
    "[login_user] has token": (r) => r.json("token") !== undefined,
    "[login_user] has user._id": (r) => r.json("user._id") !== undefined,
    "[login_user] under 2s": (r) => r.timings.duration < 2000,
  });

  userErrorRate.add(!ok);
  return ok ? res.json() : null; // return full body — callers extract token or user
}

export function updateUserProfile(headers, vu, iter) {
  const unique = `${vu}_${iter}_${Date.now()}`;

  const res = http.put(
    `${BASE_URL}/profile`,
    JSON.stringify({
      name: `Updated Volume User ${unique}`,
      phone: "98765432",
      address: `Updated Address ${unique}, Singapore`,
    }),
    { headers },
  );

  userUpdateProfileDuration.add(res.timings.duration);

  const ok = check(res, {
    "[update_profile] status 200": (r) => r.status === 200,
    "[update_profile] success is true": (r) => r.json("success") === true,
    "[update_profile] has updatedUser": (r) =>
      r.json("updatedUser") !== undefined,
    "[update_profile] under 2s": (r) => r.timings.duration < 2000,
  });

  userErrorRate.add(!ok);
  return ok ? res.json("updatedUser") : null;
}
