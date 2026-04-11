// Name: Tan Qin Yong
// Student No: A0253468W

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { Faker } from "k6/x/faker";
import exec from "k6/execution";

const BASE_URL = "http://localhost:6060/api/v1/auth";

// Custom Metrics 
const authLatency = new Trend("auth_latency", true);
const authTTFB = new Trend("auth_ttfb", true);
const authErrorRate = new Rate("auth_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    stress_auth: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 30 },  // Warm up
        { duration: "2m", target: 30 },  // Average Load
        { duration: "1m", target: 100 }, // Ramp to Degradation Point
        { duration: "2m", target: 100 }, // Sustained Degradation (Things get slow here)
        { duration: "1m", target: 250 }, // Ramp to Breaking Point
        { duration: "2m", target: 250 }, // Sustained Extreme (Trying to force errors)
        { duration: "1m", target: 0 },   // Cool down
      ],
    },
  },
  thresholds: {
    // Bcrypt hashing is CPU heavy. Under extreme stress, response times will 
    // naturally spike. We set a generous 2000ms threshold for p90.
    "http_req_duration": ["p(90)<2000"], 
    "http_req_failed": ["rate<0.05"], // Allowing up to 5% failure under extreme stress
  },
};

export default function () {
  // Destructure the way xk6-faker expects
  const { person, internet, address } = new Faker();
  
  // Signature: password(lower, upper, numeric, special, space, length)
  const userPassword = internet.password(true, true, true, true, false, 10);
  // Creates an email like: user_15_402@ecommerce.test (VU #15, Iteration #402)
  const userEmail = `user_${exec.vu.idInTest}_${exec.scenario.iterationInTest}@ecommerce.test`;

  // 1. REGISTER FLOW
  const registerPayload = JSON.stringify({
    name: person.name(),
    email: userEmail,
    password: userPassword,
    phone: person.phone(),
    address: address.street(),
    answer: person.hobby(),
    DOB: "2000-01-01" 
  });

  const headers = { "Content-Type": "application/json" };

  const regRes = http.post(`${BASE_URL}/register`, registerPayload, { headers });

  check(regRes, { "Register status is 201": (r) => r.status === 201 });
  
  authLatency.add(regRes.timings.duration);
  authTTFB.add(regRes.timings.waiting);
  authErrorRate.add(regRes.status !== 201);

  sleep(1); // Simulate the user taking a second before logging in

  // 2. LOGIN FLOW
  // Immediately attempt to log in with the credentials we just registered
  const loginPayload = JSON.stringify({
    email: userEmail,
    password: userPassword,
  });

  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, { headers });

  check(loginRes, { "Login status is 200": (r) => r.status === 200 });

  authLatency.add(loginRes.timings.duration);
  authTTFB.add(loginRes.timings.waiting);
  authErrorRate.add(loginRes.status !== 200);

  sleep(1);
}

// Custom Summary Table Output
export function handleSummary(data) {
  const reqsMetric = data.metrics[`http_reqs`];
  const rtMetric = data.metrics[`auth_latency`];
  const errMetric = data.metrics[`auth_error_rate`];

  const reqs = reqsMetric ? reqsMetric.values.count : 0;
  // Total duration of the test stages is 10 minutes (600 seconds)
  const rps = (reqs / 600).toFixed(2); 
  const p75 = rtMetric && rtMetric.values["p(75)"] ? rtMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
  const p90 = rtMetric && rtMetric.values["p(90)"] ? rtMetric.values["p(90)"].toFixed(2) + " ms" : "N/A";
  const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";

  let customTable = "\n=========================================================================\n";
  customTable += " Test Type |   Avg RPS   | p75 Response | p90 Response | Error Rate \n";
  customTable += "-------------------------------------------------------------------------\n";
  customTable += ` Auth Flow | ${rps.padStart(11)} | ${p75.padStart(12)} | ${p90.padStart(12)} | ${err.padStart(10)}\n`;
  customTable += "=========================================================================\n\n";

  return { stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable };
}