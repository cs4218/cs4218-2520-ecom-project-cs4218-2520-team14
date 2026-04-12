import { check } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

export const orderCreateDuration = new Trend("order_create_duration");
export const orderFetchMineDuration = new Trend("order_fetch_mine_duration");
export const orderStatusDuration = new Trend("order_status_duration");
export const orderErrorRate = new Rate("order_error_rate");

const BASE_URL = "http://localhost:6060/api/v1";

const ORDER_STATUSES = [
  "Not Process",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancel",
];

export function createOrder(headers, productId, productPrice) {
  const cart = Array.from(
    { length: Math.floor(Math.random() * 5) + 1 },
    () => ({ _id: productId, price: productPrice }),
  );

  const res = http.post(
    `${BASE_URL}/product/braintree/payment`,
    JSON.stringify({ nonce: "fake-nonce", cart }),
    { headers },
  );

  orderCreateDuration.add(res.timings.duration);

  // Controller returns { ok: true } on success
  const ok = check(res, {
    "[create order] 200": (r) => r.status === 200,
    "[create order] ok true": (r) => r.json("ok") === true,
    "[create order] under 3s": (r) => r.timings.duration < 3000,
  });

  orderErrorRate.add(!ok);
  return ok ? res.json() : null;
}

export function fetchMyOrders(headers) {
  const res = http.get(`${BASE_URL}/auth/orders`, { headers });

  orderFetchMineDuration.add(res.timings.duration);

  // Raw array response — no success wrapper
  const ok = check(res, {
    "[fetch_my_orders] status 200": (r) => r.status === 200,
    "[fetch_my_orders] is array": (r) => Array.isArray(r.json()),
    "[fetch_my_orders] under 3s": (r) => r.timings.duration < 3000,
  });

  orderErrorRate.add(!ok);
  return ok ? res.json() : [];
}

export function updateOrderStatus(headers, orderId, statusIndex) {
  const status = ORDER_STATUSES[statusIndex % ORDER_STATUSES.length];

  const res = http.put(
    `${BASE_URL}/auth/order-status/${orderId}`,
    JSON.stringify({ status }),
    { headers },
  );

  orderStatusDuration.add(res.timings.duration);

  // Returns raw updated order — check for _id as presence signal
  const ok = check(res, {
    "[update_order_status] status 200": (r) => r.status === 200,
    "[update_order_status] has _id": (r) => r.json("_id") !== undefined,
    "[update_order_status] status matches": (r) => r.json("status") === status,
    "[update_order_status] under 2s": (r) => r.timings.duration < 2000,
  });

  orderErrorRate.add(!ok);
  return ok ? res.json() : null;
}
