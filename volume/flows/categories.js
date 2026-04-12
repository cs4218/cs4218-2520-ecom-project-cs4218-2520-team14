import { check } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

export const categoryCreateDuration = new Trend("categories_create_duration");
export const categoryFetchAllDuration = new Trend(
  "categories_fetch_all_duration",
);
export const categorySingleDuration = new Trend("categories_single_duration");
export const categoryUpdateDuration = new Trend("category_update_duration");
export const categoryErrorRate = new Rate("categories_error_rate");

const BASE_URL = "http://localhost:6060/api/v1/category";

export function createCategory(headers, vu, iter) {
  const res = http.post(
    `${BASE_URL}/create-category`,
    JSON.stringify({ name: `Volume Category ${vu}_${iter}_${Date.now()}` }),
    { headers },
  );

  categoryCreateDuration.add(res.timings.duration);

  const ok = check(res, {
    "[create_category] status 201": (r) => r.status === 201,
    "[create_category] success is true": (r) => r.json("success") === true,
    "[create_category] has _id": (r) => r.json("category._id") !== undefined,
    "[create_category] has slug": (r) => r.json("category.slug") !== undefined,
    "[create_category] under 2s": (r) => r.timings.duration < 2000,
  });

  categoryErrorRate.add(!ok);
  return ok ? res.json("category") : null;
}

export function fetchAllCategories(headers) {
  const res = http.get(`${BASE_URL}/get-category`, { headers });

  categoryFetchAllDuration.add(res.timings.duration);

  const ok = check(res, {
    "[fetch_all_categories] status 200": (r) => r.status === 200,
    "[fetch_all_categories] success is true": (r) => r.json("success") === true,
    "[fetch_all_categories] category is array": (r) =>
      Array.isArray(r.json("category")),
    "[fetch_all_categories] under 3s": (r) => r.timings.duration < 3000,
  });

  categoryErrorRate.add(!ok);
  return ok ? res.json("category") : [];
}

export function fetchSingleCategory(headers, slug) {
  const res = http.get(`${BASE_URL}/single-category/${slug}`, { headers });

  categorySingleDuration.add(res.timings.duration);

  const ok = check(res, {
    "[single_category] status 200": (r) => r.status === 200,
    "[single_category] success is true": (r) => r.json("success") === true,
    "[single_category] category name present": (r) =>
      r.json("category.name") !== undefined,
    "[single_category] category slug matches": (r) =>
      r.json("category.slug") === slug,
    "[single_category] single fetch under 2s": (r) => r.timings.duration < 2000,
  });

  categoryErrorRate.add(!ok);
  return ok ? res.json("category") : null;
}

export function updateCategory(headers, id, vu, iter) {
  const updatedName = `Updated Volume Category ${vu}_${iter}_${Date.now()}`;

  const res = http.put(
    `${BASE_URL}/update-category/${id}`,
    JSON.stringify({ name: updatedName }),
    { headers },
  );

  categoryUpdateDuration.add(res.timings.duration);

  const ok = check(res, {
    "[update_category] status 200": (r) => r.status === 200,
    "[update_category] success is true": (r) => r.json("success") === true,
    "[update_category] name updated": (r) =>
      r.json("category.name") === updatedName,
  });

  categoryErrorRate.add(!ok);
  return ok ? res.json("category") : null;
}
