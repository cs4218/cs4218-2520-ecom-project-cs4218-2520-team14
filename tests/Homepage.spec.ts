/* eslint-disable notice/notice */

// Name: Chia York Lim
// Student ID: A0258147X

import { test, expect } from "@playwright/test";
import mongoose from "mongoose";
import Product from "../models/productModel";

let firstProductDetails: any;

const viewports = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

test.describe.configure({ mode: "parallel" });

test.beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL!);

  firstProductDetails = await Product.findOne({}).sort({ createdAt: -1 });

  await mongoose.disconnect();
});

for (const viewportName of Object.keys(viewports)) {
  const viewport = viewports[viewportName as keyof typeof viewports];

  test.describe(`Homepage for ${viewportName}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
      await Promise.all([
        page.waitForResponse("**/api/v1/category/get-category"),
        page.waitForResponse("**/api/v1/product/product-count"),
        page.waitForResponse("**/api/v1/product/product-list/**"),
        page.goto("/"),
      ]);
      await page.evaluate(() => localStorage.clear());
    });

    test("should have correct title", async ({ page }) => {
      await expect(page).toHaveTitle("ALL Products - Best offers ");
    });

    test("should display banner image", async ({ page }) => {
      const bannerImg = page.locator("img.banner-img");
      await expect(bannerImg).toBeVisible();
      await expect(bannerImg).toHaveAttribute("src", "/images/Virtual.png");
      await expect(bannerImg).toHaveAttribute("alt", "bannerimage");
    });

    test("should display All Products heading", async ({ page }) => {
      await expect(page.locator("h1:has-text('All Products')")).toBeVisible();
    });

    test("should display filter sections", async ({ page }) => {
      await expect(
        page.locator("h4:has-text('Filter By Category')"),
      ).toBeVisible();
      await expect(
        page.locator("h4:has-text('Filter By Price')"),
      ).toBeVisible();
      await expect(
        page.locator("button:has-text('RESET FILTERS')"),
      ).toBeVisible();
    });

    test("should display category checkboxes", async ({ page }) => {
      await expect(page.locator(".ant-checkbox-wrapper")).toHaveCount(3);
      await expect(
        page.locator(".ant-checkbox-wrapper", { hasText: "Electronics" }),
      ).toBeVisible();
      await expect(
        page.locator(".ant-checkbox-wrapper", { hasText: "Books" }),
      ).toBeVisible();
      await expect(
        page.locator(".ant-checkbox-wrapper", { hasText: "Clothing" }),
      ).toBeVisible();
    });

    test("should display price radio buttons", async ({ page }) => {
      await expect(page.locator(".ant-radio-wrapper")).toHaveCount(6);
      await expect(page.locator(".ant-radio-wrapper").nth(0)).toHaveText(
        "$0 to 19",
      );
      await expect(page.locator(".ant-radio-wrapper").nth(1)).toHaveText(
        "$20 to 39",
      );
      await expect(page.locator(".ant-radio-wrapper").nth(2)).toHaveText(
        "$40 to 59",
      );
      await expect(page.locator(".ant-radio-wrapper").nth(3)).toHaveText(
        "$60 to 79",
      );
      await expect(page.locator(".ant-radio-wrapper").nth(4)).toHaveText(
        "$80 to 99",
      );
      await expect(page.locator(".ant-radio-wrapper").nth(5)).toHaveText(
        "$100 or more",
      );
    });

    test("should display product cards", async ({ page }) => {
      await expect(
        page.locator('[data-testid="product-item"]').first(),
      ).toBeVisible();
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(6);
    });

    test("should be able to render product card", async ({ page }) => {
      const firstProduct = page.locator('[data-testid="product-item"]', {
        hasText: firstProductDetails.name,
      });
      await expect(firstProduct.locator("img")).toBeVisible();
      await expect(firstProduct.locator("img")).toHaveAttribute(
        "src",
        `/api/v1/product/product-photo/${firstProductDetails._id.toString()}`,
      );
      await expect(firstProduct.locator("h5").first()).toHaveText(
        firstProductDetails.name,
      );
      await expect(firstProduct.locator(".card-price")).toHaveText(
        `$${firstProductDetails.price.toFixed(2)}`,
      );
      await expect(
        page.getByText(firstProductDetails.description.substring(0, 60)),
      ).toBeVisible();
      await expect(firstProduct.locator("button").first()).toHaveText(
        "More Details",
      );
      await expect(firstProduct.locator("button").nth(1)).toHaveText(
        "ADD TO CART",
      );
    });

    test("should be able to render load more button", async ({ page }) => {
      await expect(page.locator("button.loadmore")).toBeVisible();
      await expect(page.locator("button.loadmore")).toHaveText("Loadmore");
    });

    test("should be able to filter products by category", async ({ page }) => {
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page
          .locator(".ant-checkbox-wrapper", { hasText: "Electronics" })
          .click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(2);
    });

    test("should be able to apply multiple category filters", async ({
      page,
    }) => {
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page.locator(".ant-checkbox-wrapper", { hasText: "Books" }).click(),
      ]);

      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page
          .locator(".ant-checkbox-wrapper", { hasText: "Electronics" })
          .click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(3);
    });

    test("should be able to remove category filter", async ({ page }) => {
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page
          .locator(".ant-checkbox-wrapper", { hasText: "Electronics" })
          .click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(2);
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-list/**"),
        page
          .locator(".ant-checkbox-wrapper", { hasText: "Electronics" })
          .click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(6);
    });

    test("should be able to filter products by price", async ({ page }) => {
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page.locator(".ant-radio-wrapper", { hasText: "$20 to 39" }).click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(3);
    });

    test("should be able to apply multiple filters", async ({ page }) => {
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page.locator(".ant-checkbox-wrapper", { hasText: "Clothing" }).click(),
      ]);
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page.locator(".ant-radio-wrapper", { hasText: "$20 to 39" }).click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(1);
    });

    test("should be able to reset filters", async ({ page }) => {
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page.locator(".ant-checkbox-wrapper", { hasText: "Clothing" }).click(),
      ]);
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-filters"),
        page.locator(".ant-radio-wrapper", { hasText: "$20 to 39" }).click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(1);
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-list/**"),
        page.locator("button", { hasText: "RESET FILTERS" }).click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(6);
      await expect(
        page.locator(".ant-radio-wrapper", { hasText: "$20 to 39" }),
      ).not.toBeChecked();
      await expect(
        page.locator(".ant-checkbox-wrapper", { hasText: "Clothing" }),
      ).not.toHaveClass(/ant-checkbox-wrapper-checked/);
    });

    test("should be able to go to product details page", async ({ page }) => {
      const firstProduct = page.locator('[data-testid="product-item"]', {
        hasText: firstProductDetails.name,
      });
      await firstProduct.locator("button", { hasText: "More Details" }).click();
      await expect(page).toHaveURL(`/product/${firstProductDetails.slug}`);
    });

    test("should be able to add product to cart", async ({ page }) => {
      const firstProduct = page.locator('[data-testid="product-item"]', {
        hasText: firstProductDetails.name,
      });
      await firstProduct.locator("button", { hasText: "ADD TO CART" }).click();
      const cartCount = page.locator(".current");
      await expect(cartCount).toHaveText("1");
      const cart = await page.evaluate(() => localStorage.getItem("cart"));
      const productInCart = firstProductDetails.toObject();
      delete productInCart.photo;
      await expect(cart).not.toBeNull();
      await expect(cart).toEqual(JSON.stringify([productInCart]));
    });

    test("should be able to load more products", async ({ page }) => {
      await Promise.all([
        page.waitForResponse("**/api/v1/product/product-list/**"),
        page.locator("button.loadmore").click(),
      ]);
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(7);
      await expect(page.locator("button.loadmore")).toBeHidden();
    });
  });
}
