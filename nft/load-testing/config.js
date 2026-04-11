// Name: Shauryan Agrawal
// Student ID: A0265846N

export const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
export const FRONTEND_URL = __ENV.FRONTEND_URL || "http://localhost:3000";

// Seeded test credentials
export const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || "admin.alpha@test.com";
export const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || "AdminPass123";

export const USER_EMAIL = __ENV.USER_EMAIL || "load.user@test.com";
export const USER_PASSWORD = __ENV.USER_PASSWORD || "UserPass123";

// Optional category/product identifiers if you want to pin specific data
export const FIXED_CATEGORY_SLUG = __ENV.CATEGORY_SLUG || "";
export const FIXED_PRODUCT_SLUG = __ENV.PRODUCT_SLUG || "";

// Common headers
export const JSON_HEADERS = {
  "Content-Type": "application/json",
};

// Threshold profiles aligned to the user stories
export const THRESHOLDS = {
  authLogin: {
    "http_req_failed{endpoint:login}": ["rate==0"],
    "http_req_duration{endpoint:login}": ["avg<500", "p(95)<1500"],
  },
  authRegister: {
    "http_req_failed{endpoint:register}": ["rate==0"],
    "http_req_duration{endpoint:register}": ["avg<800", "p(95)<1500"],
  },
  authForgotPassword: {
    "http_req_failed{endpoint:forgot_password}": ["rate==0"],
    "http_req_duration{endpoint:forgot_password}": ["p(95)<1500"],
  },
  productBrowsing: {
    "http_req_failed{group:product_browsing}": ["rate==0"],

    // calibrated to remain strict but realistic for your local mixed-load setup
    "http_req_duration{endpoint:get_product_list}": ["avg<1300", "p(95)<2100"],
    "http_req_duration{endpoint:get_product_detail}": ["avg<2400", "p(95)<3300"],
    "http_req_duration{endpoint:search_product}": ["avg<1300", "p(95)<2100"],
    "http_req_duration{endpoint:product_filters}": ["p(95)<2150"],
    "http_req_duration{endpoint:product_category}": ["p(95)<3200"],
  },
  categoryManagement: {
    "http_req_failed{group:category_management}": ["rate==0"],
    "http_req_duration{endpoint:get_category_list}": ["avg<300", "p(95)<1500"],
    "http_req_duration{endpoint:create_category}": ["avg<700", "p(95)<1500"],
    "http_req_duration{endpoint:update_category}": ["avg<700", "p(95)<1500"],
  },
  profileOrders: {
    "http_req_failed{group:user_profile_orders}": ["rate==0"],
    "http_req_duration{endpoint:get_profile_page_proxy}": ["avg<400", "p(95)<1500"],
    "http_req_duration{endpoint:update_profile}": ["avg<600", "p(95)<1500"],
    "http_req_duration{endpoint:get_orders}": ["avg<500", "p(95)<1500"],
  },
  mixedWorkload: {
    "http_req_failed{group:mixed_workload}": ["rate<0.01"],
    "http_req_duration{group:mixed_workload}": ["avg<600", "p(95)<2000", "p(99)<3000"],
  },
};