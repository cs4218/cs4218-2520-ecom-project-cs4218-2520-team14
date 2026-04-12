import { sleep } from "k6";
import http from "k6/http";
import { Counter } from "k6/metrics";

import {
  createProduct,
  fetchAllProducts,
  fetchSingleProduct,
  productCreateDuration,
  productErrorRate,
  productFetchAllDuration,
  productFetchOneDuration,
  productSearchDuration,
  searchProducts,
} from "../flows/products.js";

productCreateDuration;
productFetchAllDuration;
productFetchOneDuration;
productSearchDuration;
productErrorRate;

const productsInserted = new Counter("products_inserted");

export const options = {
  scenarios: {
    // Scenario 1: Data loader, progressively inserts more products each iteration
    product_loader: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 40,
      maxDuration: "3m",
      exec: "productLoader",
    },

    // Scenario 2: Concurrent users running a realistic product browsing flow
    product_user_simulation: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "60s", target: 20 },
        { duration: "120s", target: 40 },
      ],
      exec: "productUserFlow",
    },
  },

  thresholds: {
    // Per-operation thresholds
    product_create_duration: ["p(95)<2000"],
    product_fetch_all_duration: ["p(95)<3000"],
    product_fetch_one_duration: ["p(95)<2000"],
    product_search_duration: ["p(95)<4000"], // regex queries — most likely to degrade

    product_error_rate: ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — runs once before all scenarios
//
// Two responsibilities:
//   1. Log in to get an auth token for the loader's create calls
//   2. Fetch a real category ID from the DB — createProduct requires one
//
// The admin account must already exist (run seed/createAdminUser.js first).
// ─────────────────────────────────────────────────────────────────────────────
export function setup() {
  // login for auth routes
  const res = http.post(
    "http://localhost:6060/api/v1/auth/login",
    JSON.stringify({
      email: __ENV.ADMIN_EMAIL,
      password: __ENV.ADMIN_PASSWORD,
    }),
    { headers: { "Content-Type": "application/json" } },
  );

  const token = res.json("token");

  // fetch the test category used for product creation
  const slug = __ENV.CATEGORY_NAME.toLowerCase().replace(/\s+/g, "-");
  const categoryRes = http.get(
    `http://localhost:6060/api/v1/category/single-category/${slug}`,
    // { headers: { Authorization: `Bearer ${token}` } },
  );

  const category = categoryRes.json("category");
  const categoryId = category._id;

  return { token, categoryId };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Product Loader
//
// Inserts 50 × (iter + 1) products per loop
// ─────────────────────────────────────────────────────────────────────────────
export function productLoader({ token, categoryId }) {
  const headers = { Authorization: `Bearer ${token}` };
  const iter = __ITER;
  const batchSize = 50 * (iter + 1);

  for (let i = 0; i < batchSize; i++) {
    const created = createProduct(headers, __VU, `${iter}_${i}`, categoryId);

    if (created) {
      productsInserted.add(1);
    }
  }

  sleep(3);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Simulated User Flow
// ─────────────────────────────────────────────────────────────────────────────
export function productUserFlow() {
  // Fetch main product listing (capped at 12 by controller)
  const products = fetchAllProducts();

  // View a single product if any were returned
  if (products.length > 0) {
    const pick = products[Math.floor(Math.random() * products.length)];
    fetchSingleProduct(pick.slug);
  }

  // Search — $regex on name + description, no index benefit
  searchProducts("Volume");

  sleep(1.0);
}
