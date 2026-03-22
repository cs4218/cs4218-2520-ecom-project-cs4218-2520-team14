// Jonas Ong, A0252052U

import test, { devices, expect } from "@playwright/test";
import jsonwebtoken from "jsonwebtoken";

const authData = {
  user: {
    _id: "69bbffabbb744c5c6268221f",
    name: "Admin User",
    email: "admin@test.com",
    phone: "99999999",
    address: "SG",
    answer: "red",
    role: 1,
  },
  token: jsonwebtoken.sign(
    { _id: "69bbffabbb744c5c6268221f" },
    process.env.JWT_SECRET,
  ),
};

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard/admin/products");
  await page.evaluate(
    (auth) => localStorage.setItem("auth", JSON.stringify(auth)),
    authData,
  );
  await page.reload();
});

const testDevices = ["Desktop Chrome", "iPad Pro 11", "Pixel 5"] as const;

for (const deviceName of testDevices) {
  test.describe(`Dashboard on ${deviceName}`, () => {
    const { defaultBrowserType, ...deviceConfig } = devices[deviceName];
    test.use(deviceConfig);

    test.describe("Product Retrieval and Display", () => {
      test("should display all products on page load", async ({ page }) => {
        // Arrange
        const productsPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/product/get-product") &&
            response.request().method() === "GET",
        );

        // Act
        await page.reload();

        // Assert
        const productsResponse = await productsPromise;
        const productsData = await productsResponse.json();

        await page
          .getByRole("heading", { name: "All Products List" })
          .waitFor();
        await expect(page.locator(".product-link")).toHaveCount(
          productsData.products.length,
        );
      });

      test("should display error when product retrieval fails", async ({
        page,
      }) => {
        // Arrange
        await page.route(
          "/api/v1/product/get-product",
          async (route) => await route.abort(),
        );

        // Act
        await page.reload();

        // Assert
        await page.getByText("Something Went Wrong").waitFor();
        await expect(page.locator(".product-link")).toHaveCount(0);
      });
    });

    test.describe("Product Card Rendering", () => {
      test("should render product cards correctly", async ({ page }) => {
        // Assert
        await page
          .getByRole("heading", { name: "All Products List" })
          .waitFor();

        const firstCard = page.locator(".card").first();
        await expect(firstCard.locator("img.card-img-top")).toBeVisible();
        await expect(firstCard.locator(".card-title")).not.toHaveText("");
        await expect(firstCard.locator(".card-text")).not.toHaveText("");
      });

      test("should display product image correctly", async ({ page }) => {
        // Arrange
        const productsPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/product/get-product") &&
            response.request().method() === "GET",
        );

        // Act
        await page.reload();

        // Assert
        const productsResponse = await productsPromise;
        const productsData = await productsResponse.json();
        const firstProductId = productsData.products[0]._id;

        const firstImage = page.locator("img.card-img-top").first();
        await expect(firstImage).toHaveAttribute(
          "src",
          `/api/v1/product/product-photo/${firstProductId}`,
        );
      });

      test("should display product name and description", async ({ page }) => {
        // Arrange
        const productsPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/product/get-product") &&
            response.request().method() === "GET",
        );

        // Act
        await page.reload();

        // Assert
        const productsResponse = await productsPromise;
        const productsData = await productsResponse.json();

        for (const product of productsData.products) {
          await page.getByText(product.name).first().waitFor();
          await page.getByText(product.description).first().waitFor();
        }
      });
    });

    test.describe("Navigation to Product Detail", () => {
      test("should navigate to individual product page on click", async ({
        page,
      }) => {
        // Act
        await page.getByRole("link", { name: /iPhone 13/i }).click();

        // Assert
        await expect(page).toHaveURL(/\/dashboard\/admin\/product\/iphone-13$/);
      });
    });

    test.describe("Empty Product List Handling", () => {
      test("should render empty state gracefully", async ({ page }) => {
        // Arrange
        await page.route("/api/v1/product/get-product", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              products: [],
              countTotal: 0,
              message: "AllProducts",
            }),
          });
        });

        // Act
        await page.reload();

        // Assert
        await page
          .getByRole("heading", { name: "All Products List" })
          .waitFor();
        await expect(page.locator(".product-link")).toHaveCount(0);
        await expect(page.locator(".card")).toHaveCount(0);
      });
    });
  });
}
