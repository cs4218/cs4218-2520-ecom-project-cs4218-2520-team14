// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, fail } from "k6";
import {
  BASE_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
  JSON_HEADERS,
} from "./config.js";

const REQUEST_TIMEOUT = __ENV.REQUEST_TIMEOUT || "15s";

function buildParams(endpointTag, extra = {}) {
  return {
    timeout: REQUEST_TIMEOUT,
    tags: { endpoint: endpointTag, ...(extra.tags || {}) },
    headers: {
      ...(extra.headers || {}),
    },
  };
}

export function safeJson(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

export function login(email, password, endpointTag = "login") {
  const payload = JSON.stringify({ email, password });

  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    payload,
    buildParams(endpointTag, {
      headers: JSON_HEADERS,
    })
  );

  const body = safeJson(res);

  const ok = check(res, {
    "login status is 200": (r) => r.status === 200,
    "login response parses as JSON": () => body !== null,
    "login response has token": () => !!body?.token,
    "login response has user": () => !!body?.user,
  });

  if (!ok) {
    fail(`Login failed for ${email}. Status=${res.status}, body=${res.body}`);
  }

  return body;
}

export function loginAdmin() {
  return login(ADMIN_EMAIL, ADMIN_PASSWORD, "login_admin");
}

export function loginUser() {
  return login(USER_EMAIL, USER_PASSWORD, "login_user");
}

export function authHeaders(token) {
  return {
    Authorization: token,
    "Content-Type": "application/json",
  };
}

export function getCategoryList() {
  return http.get(
    `${BASE_URL}/api/v1/category/get-category`,
    buildParams("get_category_list")
  );
}

export function getProductList() {
  return http.get(
    `${BASE_URL}/api/v1/product/get-product`,
    buildParams("get_product_list")
  );
}

export function getProductCount() {
  return http.get(
    `${BASE_URL}/api/v1/product/product-count`,
    buildParams("get_product_count")
  );
}

export function getProductPage(page = 1) {
  return http.get(
    `${BASE_URL}/api/v1/product/product-list/${page}`,
    buildParams("get_product_page")
  );
}

export function searchProducts(keyword) {
  return http.get(
    `${BASE_URL}/api/v1/product/search/${encodeURIComponent(keyword)}`,
    buildParams("search_product")
  );
}

export function filterProducts(checked = [], radio = []) {
  return http.post(
    `${BASE_URL}/api/v1/product/product-filters`,
    JSON.stringify({ checked, radio }),
    buildParams("product_filters", {
      headers: JSON_HEADERS,
    })
  );
}

export function getSingleProduct(slug) {
  return http.get(
    `${BASE_URL}/api/v1/product/get-product/${slug}`,
    buildParams("get_product_detail")
  );
}

export function getRelatedProducts(pid, cid) {
  return http.get(
    `${BASE_URL}/api/v1/product/related-product/${pid}/${cid}`,
    buildParams("related_product")
  );
}

export function getCategoryProducts(slug, tags = {}) {
  return http.get(
    `${BASE_URL}/api/v1/product/product-category/${slug}`,
    buildParams("product_category", { tags })
  );
}

export function createCategory(token, name) {
  return http.post(
    `${BASE_URL}/api/v1/category/create-category`,
    JSON.stringify({ name }),
    buildParams("create_category", {
      headers: authHeaders(token),
    })
  );
}

export function updateCategory(token, id, name) {
  return http.put(
    `${BASE_URL}/api/v1/category/update-category/${id}`,
    JSON.stringify({ name }),
    buildParams("update_category", {
      headers: authHeaders(token),
    })
  );
}

export function getOrders(token) {
  return http.get(
    `${BASE_URL}/api/v1/auth/orders`,
    buildParams("get_orders", {
      headers: authHeaders(token),
    })
  );
}

export function updateProfile(token, payload) {
  return http.put(
    `${BASE_URL}/api/v1/auth/profile`,
    JSON.stringify(payload),
    buildParams("update_profile", {
      headers: authHeaders(token),
    })
  );
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function uniqueSuffix() {
  return `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

export function extractCategories() {
  const res = getCategoryList();
  check(res, {
    "category list status 200": (r) => r.status === 200,
  });

  const body = safeJson(res);
  return Array.isArray(body?.category) ? body.category : [];
}

export function extractProducts() {
  const res = getProductList();
  check(res, {
    "product list status 200": (r) => r.status === 200,
  });

  const body = safeJson(res);
  return Array.isArray(body?.products) ? body.products : [];
}