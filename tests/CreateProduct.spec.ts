// Jonas Ong, A0252052U

import test, { devices, expect } from "@playwright/test";
import jsonwebtoken from "jsonwebtoken";

// test.describe.configure({ mode: "parallel" });

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
  await page.goto("/dashboard/admin/create-product");
  await page.evaluate(
    (authData) => localStorage.setItem("auth", JSON.stringify(authData)),
    authData,
  );
  await page.reload();
});

const testDevices = ["Desktop Chrome", "iPad Pro 11", "Pixel 5"] as const;

for (const deviceName of testDevices) {
  test.describe(`Dashboard on ${deviceName}`, () => {
    const { defaultBrowserType, ...deviceConfig } = devices[deviceName];
    test.use(deviceConfig);

    test.describe("Category Loading", () => {
      test("should display error when category retrieval fails", async ({
        page,
      }) => {
        // Arrange
        await page.route(
          "/api/v1/category/get-category",
          async (route) => await route.abort(),
        );
        await page.reload();

        // Assert
        await page
          .getByText("Something went wrong in getting category")
          .waitFor();
      });

      test("should display available categories on page load", async ({
        page,
      }) => {
        // Assert
        await page.getByRole("heading", { name: "Create Product" }).waitFor();

        await page.locator("#rc_select_0").click(); // select category

        await page.getByTitle("Electronics").waitFor();
        await page.getByTitle("Books").waitFor();
        await page.getByTitle("Clothing").waitFor();
      });
    });

    test.describe("Photo Upload and Preview", () => {
      test("should upload photo successfully", async ({ page }) => {
        // Act
        await page
          .locator('input[type="file"]')
          .setInputFiles("tests/fixtures/test-image.png");

        // Assert
        await expect(page.getByAltText("product_photo")).toBeVisible();
      });

      test("should replace uploaded photo", async ({ page }) => {
        // Act - Upload first image
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles("tests/fixtures/test-image.png");
        await page.getByText("test-image.png").waitFor();

        // Act - Upload second image
        await fileInput.setInputFiles("tests/fixtures/test-image-2.png");

        // Assert
        await page.getByText("test-image-2.png").waitFor();
        await page.getByText("test-image.png").waitFor({ state: "detached" });
      });
    });

    test.describe("Product Creation", () => {
      test("should create product successfully with valid inputs and photo", async ({
        page,
        request,
      }) => {
        // Arrange - listen to the returned product ID for cleanup
        const productPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/product/create-product") &&
            response.request().method() === "POST",
        );

        // Act
        await page.getByPlaceholder("write a name").fill("New Product");
        await page
          .getByPlaceholder("write a description")
          .fill("New Description");
        await page.getByPlaceholder("write a price").fill("49.99");
        await page.getByPlaceholder("write a quantity").fill("100");
        await page.locator("#rc_select_0").click(); // select category
        await page.getByTitle("Electronics").click();
        await page.locator("#rc_select_1").click(); // select shipping
        await page.getByTitle("Yes").click();

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles("tests/fixtures/test-image.png");
        await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

        // Assert
        await page.getByText("Product created successfully").waitFor();
        const productResponse = await productPromise;
        const productData = await productResponse.json();
        const productId = productData.products._id;

        // Cleanup
        const response = await request.delete(
          `/api/v1/product/delete-product/${productId}`,
          { headers: { Authorization: `Bearer ${authData.token}` } },
        );
        expect(response.ok()).toBeTruthy();
      });

      test("should create product successfully without photo", async ({
        page,
        request,
      }) => {
        // Arrange
        const productPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/product/create-product") &&
            response.request().method() === "POST",
        );

        // Act
        await page.getByPlaceholder("write a name").fill("Product No Photo");
        await page.getByPlaceholder("write a description").fill("Description");
        await page.getByPlaceholder("write a price").fill("29.99");
        await page.getByPlaceholder("write a quantity").fill("75");
        await page.locator("#rc_select_0").click(); // select category
        await page.getByTitle("Books").click();
        await page.locator("#rc_select_1").click(); // select shipping
        await page.getByTitle("No").click();
        await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

        // Assert
        await page.getByText("Product created successfully").waitFor();
        const productResponse = await productPromise;
        const productData = await productResponse.json();
        const productId = productData.products._id;

        // Cleanup
        const response = await request.delete(
          `/api/v1/product/delete-product/${productId}`,
          { headers: { Authorization: `Bearer ${authData.token}` } },
        );
        expect(response.ok()).toBeTruthy();
      });

      test("should display error when product creation fails", async ({
        page,
      }) => {
        // Arrange
        await page.route(
          "/api/v1/product/create-product",
          async (route) => await route.abort(),
        );

        // Act
        await page.getByPlaceholder("write a name").fill("Failing Product");
        await page.getByPlaceholder("write a description").fill("Description");
        await page.getByPlaceholder("write a price").fill("19.99");
        await page.getByPlaceholder("write a quantity").fill("50");
        await page.locator("#rc_select_0").click(); // select category
        await page.getByTitle("Electronics").click();
        await page.locator("#rc_select_1").click(); // select shipping
        await page.getByTitle("Yes").click();
        await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

        // Assert
        await page.getByText("Something went wrong").waitFor();
      });
    });
  });
}
