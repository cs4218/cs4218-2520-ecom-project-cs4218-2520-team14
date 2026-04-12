import { check } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

export const productCreateDuration = new Trend("product_create_duration");
export const productFetchAllDuration = new Trend("product_fetch_all_duration");
export const productFetchOneDuration = new Trend("product_fetch_one_duration");
// export const productFetchPageDuration = new Trend(
//   "product_fetch_page_duration",
// );
// export const productCountDuration = new Trend("product_count_duration");
export const productSearchDuration = new Trend("product_search_duration");
// export const productFilterDuration = new Trend("product_filter_duration");
// export const productByCategoryDuration = new Trend(
//   "product_by_category_duration",
// );
export const productErrorRate = new Rate("product_error_rate");

const BASE_URL = "http://localhost:6060/api/v1/product";

export function createProduct(headers, vu, iter, categoryId) {
  const name = `Volume Product ${vu}_${iter}_${Date.now()}`;

  // k6 sends a plain object as multipart/form-data automatically
  const formData = {
    name,
    description: `Volume test product description for ${name}. `.repeat(5),
    price: (Math.random() * 500 + 1).toFixed(2),
    category: categoryId,
    quantity: String(Math.floor(Math.random() * 1000) + 1),
  };

  const res = http.post(`${BASE_URL}/create-product`, formData, { headers });

  productCreateDuration.add(res.timings.duration);

  const ok = check(res, {
    "[create_product] status 201": (r) => r.status === 201,
    "[create_product] success true": (r) => r.json("success") === true,
    "[create_product] has _id": (r) => r.json("products._id") !== undefined,
    "[create_product] has slug": (r) => r.json("products.slug") !== undefined,
    "[create_product] under 2s": (r) => r.timings.duration < 2000,
  });

  productErrorRate.add(!ok);
  return ok ? res.json("products") : null;
}

export function fetchAllProducts() {
  const res = http.get(`${BASE_URL}/get-product`);

  productFetchAllDuration.add(res.timings.duration);

  const ok = check(res, {
    "[fetch_all_products] status 200": (r) => r.status === 200,
    "[fetch_all_products] success true": (r) => r.json("success") === true,
    "[fetch_all_products] products is array": (r) =>
      Array.isArray(r.json("products")),
    "[fetch_all_products] under 3s": (r) => r.timings.duration < 3000,
  });

  productErrorRate.add(!ok);
  return ok ? res.json("products") : [];
}

export function fetchSingleProduct(slug) {
  const res = http.get(`${BASE_URL}/get-product/${slug}`);

  productFetchOneDuration.add(res.timings.duration);

  const ok = check(res, {
    "[fetch_single_product] status 200": (r) => r.status === 200,
    "[fetch_single_product] success true": (r) => r.json("success") === true,
    "[fetch_single_product] product present": (r) => r.json("product") !== null,
    "[fetch_single_product] under 2s": (r) => r.timings.duration < 2000,
  });

  productErrorRate.add(!ok);
  return ok ? res.json("product") : null;
}

export function searchProducts(keyword) {
  const res = http.get(`${BASE_URL}/search/${encodeURIComponent(keyword)}`);

  productSearchDuration.add(res.timings.duration);

  // Note: returns raw array, not wrapped — check accordingly
  const ok = check(res, {
    "[search_products] status 200": (r) => r.status === 200,
    "[search_products] is array": (r) => Array.isArray(r.json()),
    "[search_products] under 4s": (r) => r.timings.duration < 4000, // higher threshold — regex is slow
  });

  productErrorRate.add(!ok);
  return ok ? res.json() : [];
}
