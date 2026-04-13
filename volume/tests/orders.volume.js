import { sleep } from "k6";
import http from "k6/http";
import { Counter } from "k6/metrics";

import {
  createOrder,
  fetchMyOrders,
  updateOrderStatus,
} from "../flows/orders.js";

const BASE_URL = "http://localhost:6060";
const ordersInserted = new Counter("orders_inserted");

export const options = {
  scenarios: {
    // Scenario 1: Data loader, progressively inserts more orders each iteration
    order_loader: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 40,
      maxDuration: "3m",
      exec: "orderLoader",
    },

    // Scenario 2: Concurrent users performing order-related actions
    order_user_simulation: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "60s", target: 20 },
        { duration: "120s", target: 40 },
      ],
      exec: "orderUserFlow",
    },
  },

  thresholds: {
    order_create_duration: ["p(95)<3000"],
    order_fetch_mine_duration: ["p(95)<3000"],

    order_status_duration: ["p(95)<2000"],
    order_error_rate: ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

export function setup() {
  // login for auth routes, and use same user for orders
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.ADMIN_EMAIL || "admin@test.com",
      password: __ENV.ADMIN_PASSWORD || "admin123",
    }),
    { headers: { "Content-Type": "application/json" } },
  );

  const token = res.json("token");

  // fetch the test product used for order creation
  const slug = __ENV.PRODUCT_NAME.toLowerCase().replace(/\s+/g, "-");
  const productRes = http.get(
    `http://localhost:6060/api/v1/product/get-product/${slug}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const product = productRes.json("product");
  const productId = product._id;
  const productPrice = product.price;

  return { token, productId, productPrice };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Order Loader
//
// Creates 100 × (iter + 1) orders per iteration under the regular user account.
// ─────────────────────────────────────────────────────────────────────────────
export function orderLoader({ token, productId, productPrice }) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const iter = __ITER;
  const batchSize = 100 * (iter + 1);

  for (let i = 0; i < batchSize; i++) {
    const created = createOrder(headers, productId, productPrice);

    if (created) {
      ordersInserted.add(1);
    }
  }

  sleep(3);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Simulated User Flow
//
// Simulates order fetching and status updates by an admin user.
// This tests read performance under volume.
// ─────────────────────────────────────────────────────────────────────────────
export function orderUserFlow({ token }) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const allOrders = fetchMyOrders(headers);

  if (allOrders.length > 0) {
    const randomOrder = allOrders[Math.floor(Math.random() * allOrders.length)];
    updateOrderStatus(headers, randomOrder._id, __ITER);
  }

  sleep(1);
}
