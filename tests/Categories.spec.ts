/* eslint-disable notice/notice */

// Name: Chia York Lim
// Student ID: A0258147X

import { test, expect } from "@playwright/test";
const viewports = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

test.describe.configure({ mode: "parallel" });

for (const [device, viewport] of Object.entries(viewports)) {
  test.describe(`Categories - ${device}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
      await Promise.all([
        page.waitForResponse("**/api/v1/category/get-category"),
        page.goto("/categories"),
      ]);
    });

    test("should have correct title", async ({ page }) => {
      await expect(page).toHaveTitle("All Categories");
    });

    test("should display page", async ({ page }) => {
      const categories = page.getByTestId("category-item");
      await expect(categories).toHaveCount(3);
      await expect(categories.getByText("Electronics")).toBeVisible();
      await expect(categories.getByText("Books")).toBeVisible();
      await expect(categories.getByText("Clothing")).toBeVisible();
    });

    test("should navigate to category page when category is clicked", async ({
      page,
    }) => {
      await page.getByTestId("category-item").getByText("Electronics").click();
      await expect(page).toHaveURL("/category/electronics");
    });
  });
}
