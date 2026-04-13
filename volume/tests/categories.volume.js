import { sleep } from "k6";
import http from "k6/http";
import { Counter } from "k6/metrics";

import {
  categoryCreateDuration,
  categoryErrorRate,
  categoryFetchAllDuration,
  categorySingleDuration,
  createCategory,
  fetchAllCategories,
  fetchSingleCategory,
  updateCategory,
} from "../flows/categories.js";

categoryCreateDuration;
categoryFetchAllDuration;
categorySingleDuration;
categoryErrorRate;

const categoriesInserted = new Counter("categories_inserted");

export const options = {
  scenarios: {
    // Scenario 1: Data loader, progressively inserts more categories each iteration
    category_loader: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 40,
      maxDuration: "3m",
      exec: "categoryLoader",
    },

    // Scenario 2: Concurrent users reading categories while the dataset grows
    category_user_simulation: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "60s", target: 20 },
        { duration: "120s", target: 40 },
      ],
      exec: "categoryUserFlow",
    },
  },

  thresholds: {
    // Per-operation response time thresholds
    categories_create_duration: ["p(95)<2000"],
    categories_fetch_all_duration: ["p(95)<3000"],
    categories_single_duration: ["p(95)<2000"],
    category_update_duration: ["p(95)<2000"],

    // Error rate — anything above 5% is a finding worth reporting
    categories_error_rate: ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

export async function setup() {
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
  return { token };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1: Category data loader
// Inserts 5 × (iteration + 1) categories per loop
// Also updates the freshly created category each loop to test update
// ─────────────────────────────────────────────────────────────────────────────
export function categoryLoader({ token }) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const iter = __ITER;
  const batchSize = 5 * (iter + 1);

  for (let i = 0; i < batchSize; i++) {
    const created = createCategory(headers, __VU, `${iter}_${i}`);

    // Immediately update one in every 10 to also exercise the PUT endpoint
    // under growing data conditions
    if (created) {
      categoriesInserted.add(1);
      if (i % 10 === 0) {
        updateCategory(headers, created._id, __VU, `${iter}_${i}`);
      }
    }
  }

  sleep(3);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2: Simulated user reading categories
// Flow: fetch all categories -> pick one at random -> fetch it by slug
// This mirrors a real user navigating a category listing page.
// ─────────────────────────────────────────────────────────────────────────────
export function categoryUserFlow() {
  const headers = { "Content-Type": "application/json" };

  // Step 1: Load the full category list (this is the query most affected by volume)
  const categories = fetchAllCategories(headers);

  // Step 2: If categories exist, simulate a user clicking into one
  if (categories.length > 0) {
    const randomCat = categories[Math.floor(Math.random() * categories.length)];

    // Step 3: Fetch that category by slug (as a real frontend router would)
    fetchSingleCategory(headers, randomCat.slug);
  }

  sleep(1);
}
