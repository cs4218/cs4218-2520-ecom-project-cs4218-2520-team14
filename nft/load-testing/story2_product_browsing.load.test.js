// Name: Shauryan Agrawal
// Student ID: A0265846N

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { BASE_URL } from "./config.js";
import {
  extractCategories,
  extractProducts,
  randomChoice,
  searchProducts,
  filterProducts,
  getSingleProduct,
  getCategoryProducts,
  safeJson,
} from "./utils.js";



const LIST_VUS = Number(__ENV.LIST_VUS || 300);
const DETAIL_VUS = Number(__ENV.DETAIL_VUS || 200);
const SEARCH_VUS = Number(__ENV.SEARCH_VUS || 150);
const FILTER_VUS = Number(__ENV.FILTER_VUS || 150);

const RAMP_DURATION = __ENV.RAMP_DURATION || "2m";
const SUSTAIN_DURATION = __ENV.SUSTAIN_DURATION || "3m";
const RAMPDOWN_DURATION = __ENV.RAMPDOWN_DURATION || "30s";

const LIST_AVG_MS = Number(__ENV.LIST_AVG_MS || 4800);
const DETAIL_AVG_MS = Number(__ENV.DETAIL_AVG_MS || 9000);
const SEARCH_AVG_MS = Number(__ENV.SEARCH_AVG_MS || 4800);
const FILTER_P95_MS = Number(__ENV.FILTER_P95_MS || 7000);
const CATEGORY_P95_MS = Number(__ENV.CATEGORY_P95_MS || 13500);
const GENERAL_P95_MS = Number(__ENV.GENERAL_P95_MS || 7000);
const DETAIL_P95_MS = Number(__ENV.DETAIL_P95_MS || 13500);

/**
 * =========================================================
 * Custom Metrics
 * =========================================================
 */

const productBrowseSuccessRate = new Rate("product_browse_success_rate");
const productBrowsePayloadIntegrityRate = new Rate(
  "product_browse_payload_integrity_rate"
);
const productBrowseServerErrorRate = new Rate(
  "product_browse_server_error_rate"
);

const productListResponseTrend = new Trend("product_list_response_time");
const productDetailResponseTrend = new Trend("product_detail_response_time");
const productSearchResponseTrend = new Trend("product_search_response_time");
const productFilterResponseTrend = new Trend("product_filter_response_time");
const categoryProductResponseTrend = new Trend(
  "category_product_response_time"
);

const emptyProductListCount = new Counter("empty_product_list_count");
const emptySearchResultBodyCount = new Counter("empty_search_result_body_count");
const malformedPayloadCount = new Counter("malformed_payload_count");

/**
 * =========================================================
 * Scenario Configuration
 * =========================================================
 */

export const options = {
  scenarios: {
    product_list_browse: {
      executor: "ramping-vus",
      exec: "browseProductListScenario",
      startVUs: 0,
      stages: [
        { duration: RAMP_DURATION, target: LIST_VUS },
        { duration: SUSTAIN_DURATION, target: LIST_VUS },
        { duration: RAMPDOWN_DURATION, target: 0 },
      ],
      tags: { endpoint_family: "product_list", group: "product_browsing" },
    },

    product_detail_view: {
      executor: "ramping-vus",
      exec: "productDetailScenario",
      startVUs: 0,
      stages: [
        { duration: RAMP_DURATION, target: DETAIL_VUS },
        { duration: SUSTAIN_DURATION, target: DETAIL_VUS },
        { duration: RAMPDOWN_DURATION, target: 0 },
      ],
      tags: { endpoint_family: "product_detail", group: "product_browsing" },
    },

    product_search: {
      executor: "ramping-vus",
      exec: "productSearchScenario",
      startVUs: 0,
      stages: [
        { duration: RAMP_DURATION, target: SEARCH_VUS },
        { duration: SUSTAIN_DURATION, target: SEARCH_VUS },
        { duration: RAMPDOWN_DURATION, target: 0 },
      ],
      tags: { endpoint_family: "product_search", group: "product_browsing" },
    },

    product_filters: {
      executor: "ramping-vus",
      exec: "productFilterScenario",
      startVUs: 0,
      stages: [
        { duration: RAMP_DURATION, target: FILTER_VUS },
        { duration: SUSTAIN_DURATION, target: FILTER_VUS },
        { duration: RAMPDOWN_DURATION, target: 0 },
      ],
      tags: { endpoint_family: "product_filters", group: "product_browsing" },
    },
  },

  thresholds: {
    "http_req_failed{group:product_browsing}": ["rate==0"],

    "http_req_duration{endpoint:get_product_list}": [
      `avg<${LIST_AVG_MS}`,
      `p(95)<${GENERAL_P95_MS}`,
    ],
    "http_req_duration{endpoint:get_product_detail}": [
      `avg<${DETAIL_AVG_MS}`,
      `p(95)<${DETAIL_P95_MS}`,
    ],
    "http_req_duration{endpoint:search_product}": [
      `avg<${SEARCH_AVG_MS}`,
      `p(95)<${GENERAL_P95_MS}`,
    ],
    "http_req_duration{endpoint:product_filters}": [
      `p(95)<${FILTER_P95_MS}`,
    ],
    "http_req_duration{endpoint:product_category}": [
      `p(95)<${CATEGORY_P95_MS}`,
    ],

    product_browse_success_rate: ["rate>0.99"],
    product_browse_payload_integrity_rate: ["rate>0.99"],
    product_browse_server_error_rate: ["rate==0"],

    product_list_response_time: [
      `avg<${LIST_AVG_MS}`,
      `p(95)<${GENERAL_P95_MS}`,
    ],
    product_detail_response_time: [
      `avg<${DETAIL_AVG_MS}`,
      `p(95)<${DETAIL_P95_MS}`,
    ],
    product_search_response_time: [
      `avg<${SEARCH_AVG_MS}`,
      `p(95)<${GENERAL_P95_MS}`,
    ],
    product_filter_response_time: [
      `p(95)<${FILTER_P95_MS}`,
    ],
    category_product_response_time: [
      `p(95)<${CATEGORY_P95_MS}`,
    ],
  },

  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

const KEYWORDS = [
  "phone",
  "laptop",
  "watch",
  "shirt",
  "shoe",
  "bag",
  "book",
];

export function setup() {
  const categories = extractCategories();
  const products = extractProducts();

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error(
      "No categories found. Seed at least 1 category before running story 2."
    );
  }

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error(
      "No products found. Seed at least 1 product before running story 2."
    );
  }

  return { categories, products };
}

export function browseProductListScenario(data) {
  group("Story 2 - product listing", () => {
    // Fixed to page 1 because current seeded dataset is too small
    // for realistic random paging across 1..3.
    const page = 1;

    const listRes = http.get(
      `${BASE_URL}/api/v1/product/product-list/${page}`,
      {
        tags: {
          endpoint: "get_product_list",
          group: "product_browsing",
        },
      }
    );

    productListResponseTrend.add(listRes.timings.duration);
    productBrowseServerErrorRate.add(listRes.status >= 500);

    const body = safeJson(listRes);

    const checksPassed = check(listRes, {
      "product list status is 200": (r) => r.status === 200,
      "product list body is not empty": (r) => !!r.body && r.body.length > 0,
      "product list parses as JSON": () => body !== null,
      "product list contains success true": () => body?.success === true,
      "product list contains products array": () =>
        Array.isArray(body?.products),
      "product list returns no more than expected page size": () =>
        Array.isArray(body?.products) ? body.products.length <= 6 : false,
      "product list products have _id fields": () =>
        Array.isArray(body?.products)
          ? body.products.every((p) => typeof p?._id === "string")
          : false,
      "product list products have names": () =>
        Array.isArray(body?.products)
          ? body.products.every((p) => typeof p?.name === "string")
          : false,
      "product list products do not include photo blob field": () =>
        Array.isArray(body?.products)
          ? body.products.every((p) => p?.photo === undefined)
          : false,
    });

    if (Array.isArray(body?.products) && body.products.length === 0) {
      emptyProductListCount.add(1);
    }

    if (body === null) {
      malformedPayloadCount.add(1);
    }

    productBrowseSuccessRate.add(checksPassed);
    productBrowsePayloadIntegrityRate.add(
      body !== null &&
        body?.success === true &&
        Array.isArray(body?.products) &&
        body.products.every((p) => typeof p?._id === "string")
    );

    sleep(1);
  });
}

export function productDetailScenario(data) {
  group("Story 2 - product detail", () => {
    const chosen = randomChoice(data.products);
    const detailRes = getSingleProduct(chosen.slug);

    productDetailResponseTrend.add(detailRes.timings.duration);
    productBrowseServerErrorRate.add(detailRes.status >= 500);

    const body = safeJson(detailRes);

    const checksPassed = check(detailRes, {
      "product detail status is 200": (r) => r.status === 200,
      "product detail body is non-empty": (r) => !!r.body && r.body.length > 0,
      "product detail parses as JSON": () => body !== null,
      "product detail success true": () => body?.success === true,
      "product detail includes product object": () => !!body?.product,
      "product detail returned slug matches request": () =>
        body?.product?.slug === chosen.slug,
      "product detail includes product name": () =>
        typeof body?.product?.name === "string",
      "product detail includes description": () =>
        typeof body?.product?.description === "string",
      "product detail includes price": () =>
        typeof body?.product?.price === "number" ||
        typeof body?.product?.price === "string",
    });

    if (body === null) {
      malformedPayloadCount.add(1);
    }

    productBrowseSuccessRate.add(checksPassed);
    productBrowsePayloadIntegrityRate.add(
      body !== null &&
        body?.success === true &&
        !!body?.product &&
        body?.product?.slug === chosen.slug
    );

    sleep(1);
  });
}

export function productSearchScenario(data) {
  group("Story 2 - product search", () => {
    const keyword = randomChoice(KEYWORDS);
    const searchRes = searchProducts(keyword);

    productSearchResponseTrend.add(searchRes.timings.duration);
    productBrowseServerErrorRate.add(searchRes.status >= 500);

    const body = safeJson(searchRes);

    const checksPassed = check(searchRes, {
      "search status is 200": (r) => r.status === 200,
      "search body is non-empty": (r) => !!r.body,
      "search parses as JSON": () => body !== null,
      "search returns array": () => Array.isArray(body),
      "search results contain objects only": () =>
        Array.isArray(body) ? body.every((p) => typeof p === "object") : false,
    });

    if (!searchRes.body) {
      emptySearchResultBodyCount.add(1);
    }

    if (body === null) {
      malformedPayloadCount.add(1);
    }

    productBrowseSuccessRate.add(checksPassed);
    productBrowsePayloadIntegrityRate.add(body !== null && Array.isArray(body));

    sleep(1);
  });
}

export function productFilterScenario(data) {
  group("Story 2 - product filter", () => {
    const category = randomChoice(data.categories);

    const radioRanges = [
      [0, 50],
      [50, 100],
      [100, 500],
      [500, 5000],
    ];

    const selectedRange = randomChoice(radioRanges);

    const filterRes = filterProducts([category._id], selectedRange);
    productFilterResponseTrend.add(filterRes.timings.duration);
    productBrowseServerErrorRate.add(filterRes.status >= 500);

    const filterBody = safeJson(filterRes);

    const filterChecksPassed = check(filterRes, {
      "filter status is 200": (r) => r.status === 200,
      "filter body is non-empty": (r) => !!r.body && r.body.length > 0,
      "filter parses as JSON": () => filterBody !== null,
      "filter success true": () => filterBody?.success === true,
      "filter returns products array": () =>
        Array.isArray(filterBody?.products),
    });

    if (filterBody === null) {
      malformedPayloadCount.add(1);
    }

    productBrowseSuccessRate.add(filterChecksPassed);
    productBrowsePayloadIntegrityRate.add(
      filterBody !== null &&
        filterBody?.success === true &&
        Array.isArray(filterBody?.products)
    );

    const catProductsRes = getCategoryProducts(category.slug, {
      endpoint: "product_category",
      group: "product_browsing",
    });
    categoryProductResponseTrend.add(catProductsRes.timings.duration);
    productBrowseServerErrorRate.add(catProductsRes.status >= 500);

    const catBody = safeJson(catProductsRes);

    const categoryChecksPassed = check(catProductsRes, {
      "category-product status is 200": (r) => r.status === 200,
      "category-product body is non-empty": (r) => !!r.body && r.body.length > 0,
      "category-product parses as JSON": () => catBody !== null,
      "category-product success true": () => catBody?.success === true,
      "category-product includes category object": () => !!catBody?.category,
      "category-product includes products array": () =>
        Array.isArray(catBody?.products),
    });

    if (catBody === null) {
      malformedPayloadCount.add(1);
    }

    productBrowseSuccessRate.add(categoryChecksPassed);
    productBrowsePayloadIntegrityRate.add(
      catBody !== null &&
        catBody?.success === true &&
        !!catBody?.category &&
        Array.isArray(catBody?.products)
    );

    sleep(1);
  });
}

export function handleSummary(data) {
  return {
    stdout: `
============================================================
Story 2: Product Browsing and Search Under Concurrent Load
============================================================

Configuration used:
- product list VUs   : ${LIST_VUS}
- product detail VUs : ${DETAIL_VUS}
- product search VUs : ${SEARCH_VUS}
- product filter VUs : ${FILTER_VUS}
- ramp duration      : ${RAMP_DURATION}
- sustain duration   : ${SUSTAIN_DURATION}
- rampdown duration  : ${RAMPDOWN_DURATION}

Thresholds used:
- product list avg   : < ${LIST_AVG_MS}ms
- detail avg         : < ${DETAIL_AVG_MS}ms
- search avg         : < ${SEARCH_AVG_MS}ms
- list/search p95    : < ${GENERAL_P95_MS}ms
- filter p95         : < ${FILTER_P95_MS}ms
- detail p95         : < ${DETAIL_P95_MS}ms
- category p95       : < ${CATEGORY_P95_MS}ms

Key custom metrics:
- product_browse_success_rate
- product_browse_payload_integrity_rate
- product_browse_server_error_rate
- product_list_response_time
- product_detail_response_time
- product_search_response_time
- product_filter_response_time
- category_product_response_time
- empty_product_list_count
- empty_search_result_body_count
- malformed_payload_count

Interpretation guidance:
- malformed_payload_count should remain 0
- product_browse_server_error_rate should remain 0
- payload integrity should remain very close to 1.00
- if thresholds fail only under very high local concurrency, record that as a valid performance finding
============================================================
`,
  };
}