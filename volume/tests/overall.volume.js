import { sleep } from "k6";
import http from "k6/http";
import { Counter } from "k6/metrics";

import {
  createCategory,
  fetchAllCategories,
  fetchSingleCategory,
  updateCategory,
} from "../flows/categories.js";
import {
  createOrder,
  fetchMyOrders,
  updateOrderStatus,
} from "../flows/orders.js";
import {
  createProduct,
  fetchAllProducts,
  fetchSingleProduct,
  searchProducts,
} from "../flows/products.js";
import { loginUser, registerUser, updateUserProfile } from "../flows/users.js";

const BASE_URL = "http://localhost:6060";

const overallCategoriesInserted = new Counter("overall_categories_inserted");
const overallProductsInserted = new Counter("overall_products_inserted");
const overallUsersInserted = new Counter("overall_users_inserted");
const overallOrdersInserted = new Counter("overall_orders_inserted");

export const options = {
  scenarios: {
    overall_loader: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 40,
      maxDuration: "3m",
      exec: "overallLoader",
    },
    overall_user_simulation: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "60s", target: 20 },
        { duration: "120s", target: 40 },
      ],
      exec: "overallUserFlow",
    },
  },

  thresholds: {
    categories_create_duration: ["p(95)<2000"],
    categories_fetch_all_duration: ["p(95)<3000"],
    categories_single_duration: ["p(95)<2000"],
    category_update_duration: ["p(95)<2000"],

    product_create_duration: ["p(95)<2000"],
    product_fetch_all_duration: ["p(95)<3000"],
    product_fetch_one_duration: ["p(95)<2000"],
    product_search_duration: ["p(95)<4000"],

    user_register_duration: ["p(95)<2000"],
    user_login_duration: ["p(95)<2000"],
    user_update_profile_duration: ["p(95)<2000"],

    order_create_duration: ["p(95)<3000"],
    order_fetch_mine_duration: ["p(95)<3000"],
    order_status_duration: ["p(95)<2000"],

    categories_error_rate: ["rate<0.05"],
    product_error_rate: ["rate<0.05"],
    user_error_rate: ["rate<0.05"],
    order_error_rate: ["rate<0.05"],
    http_req_failed: ["rate<0.05"],
  },
};

export function setup() {
  const adminEmail = __ENV.ADMIN_EMAIL || "admin@test.com";
  const adminPassword = __ENV.ADMIN_PASSWORD || "admin123";
  const categoryName = __ENV.CATEGORY_NAME || "Volume Test Category";
  const productName = __ENV.PRODUCT_NAME || "Volume Seed Product";

  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
    { headers: { "Content-Type": "application/json" } },
  );

  const token = res.json("token");
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");
  const categoryRes = http.get(
    `${BASE_URL}/api/v1/category/single-category/${categorySlug}`,
    { headers: authHeaders },
  );
  const category = categoryRes.json("category");

  const productSlug = productName.toLowerCase().replace(/\s+/g, "-");
  const productRes = http.get(
    `${BASE_URL}/api/v1/product/get-product/${productSlug}`,
    { headers: authHeaders },
  );
  const product = productRes.json("product");

  if (!category || !category._id) {
    throw new Error(`Seed category not found: ${categoryName}`);
  }

  if (!product || !product._id) {
    throw new Error(`Seed product not found: ${productName}`);
  }

  return {
    token,
    categoryId: category._id,
    productId: product._id,
    productPrice: product.price,
    adminEmail,
    adminPassword,
    categoryName,
  };
}

export function overallLoader({
  token,
  categoryId,
  productId,
  productPrice,
  adminEmail,
  adminPassword,
}) {
  const jsonAuthHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const productCreateHeaders = {
    Authorization: `Bearer ${token}`,
  };
  const publicHeaders = { "Content-Type": "application/json" };
  const iter = __ITER;

  const categoryBatchSize = 1;
  const productBatchSize = 3;
  const userBatchSize = 1;
  const orderBatchSize = 2;

  for (let i = 0; i < categoryBatchSize; i++) {
    const createdCategory = createCategory(
      jsonAuthHeaders,
      __VU,
      `${iter}_${i}`,
    );
    if (createdCategory) {
      overallCategoriesInserted.add(1);
      if (i % 2 === 0) {
        updateCategory(
          jsonAuthHeaders,
          createdCategory._id,
          __VU,
          `${iter}_${i}`,
        );
      }
    }
  }

  for (let i = 0; i < productBatchSize; i++) {
    const createdProduct = createProduct(
      productCreateHeaders,
      __VU,
      `${iter}_${i}`,
      categoryId,
    );
    if (createdProduct) {
      overallProductsInserted.add(1);
    }
  }

  for (let i = 0; i < userBatchSize; i++) {
    const createdUser = registerUser(publicHeaders, __VU, `${iter}_${i}`);
    if (createdUser) {
      overallUsersInserted.add(1);
    }
  }

  for (let i = 0; i < orderBatchSize; i++) {
    const createdOrder = createOrder(jsonAuthHeaders, productId, productPrice);
    if (createdOrder) {
      overallOrdersInserted.add(1);
    }
  }

  const loggedIn = loginUser(publicHeaders, adminEmail, adminPassword);
  if (loggedIn?.token) {
    updateUserProfile(jsonAuthHeaders, __VU, iter);
  }

  sleep(2);
}

export function overallUserFlow({
  token,
  productId,
  productPrice,
  adminEmail,
  adminPassword,
}) {
  const publicHeaders = { "Content-Type": "application/json" };
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const categories = fetchAllCategories(publicHeaders);
  if (categories.length > 0) {
    const selectedCategory =
      categories[Math.floor(Math.random() * categories.length)];
    fetchSingleCategory(publicHeaders, selectedCategory.slug);
  }

  const products = fetchAllProducts();
  if (products.length > 0) {
    const selectedProduct =
      products[Math.floor(Math.random() * products.length)];
    fetchSingleProduct(selectedProduct.slug);
  }
  searchProducts("Volume");

  loginUser(publicHeaders, adminEmail, adminPassword);
  updateUserProfile(authHeaders, __VU, __ITER);

  createOrder(authHeaders, productId, productPrice);
  const orders = fetchMyOrders(authHeaders);
  if (orders.length > 0) {
    const selectedOrder = orders[Math.floor(Math.random() * orders.length)];
    updateOrderStatus(authHeaders, selectedOrder._id, __ITER);
  }

  sleep(1);
}
