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

const seededProductSlug = "iphone-13";
const electronicsCategoryId = "69bff6d702dde54f12009ef3";

test.beforeEach(async ({ page }) => {
  await page.goto(`/dashboard/admin/product/${seededProductSlug}`);
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

    test.describe("Product Data Loading", () => {
      test("should display product information on page load", async ({
        page,
      }) => {
        // Assert
        await page.getByRole("heading", { name: "Update Product" }).waitFor();

        await expect(page.getByPlaceholder("write a name")).toHaveValue(
          "iPhone 13",
        );
        await expect(page.getByPlaceholder("write a description")).toHaveValue(
          "Latest Apple iPhone with A15 Bionic chip",
        );
        await expect(page.getByPlaceholder("write a Price")).toHaveValue("20");
        await expect(page.getByPlaceholder("write a quantity")).toHaveValue(
          "20",
        );
        await page.getByTitle("Electronics").waitFor();
        await page.getByTitle("Yes").waitFor();
      });

      test("should display existing product photo", async ({ page }) => {
        // Assert
        const image = page.getByAltText("product_photo");
        await expect(image).toBeVisible();
        await expect(image).toHaveAttribute(
          "src",
          /\/api\/v1\/product\/product-photo\//,
        );
      });
    });

    test.describe("Category Loading", () => {
      test("should display available categories on page load", async ({
        page,
      }) => {
        // Act
        // await page.getByText("Electronics").click();
        await page.locator("span", { hasText: "Electronics" }).click(); // select category

        // Assert
        await page.getByTitle("Electronics").nth(1).waitFor();
        await page.getByTitle("Books").waitFor();
        await page.getByTitle("Clothing").waitFor();
      });

      test("should display error when category retrieval fails", async ({
        page,
      }) => {
        // Arrange
        await page.route(
          "/api/v1/category/get-category",
          async (route) => await route.abort(),
        );

        // Act
        await page.reload();

        // Assert
        await page
          .getByText("Something went wrong in getting category")
          .waitFor();
      });
    });

    test.describe("Photo Upload and Preview", () => {
      test("should upload new product photo", async ({ page }) => {
        // Act
        await page
          .locator('input[type="file"]')
          .setInputFiles("tests/fixtures/test-image.png");

        // Assert
        await page.getByText("test-image.png").waitFor();
        await expect(page.getByAltText("product_photo")).toBeVisible();
      });

      test("should replace existing product photo preview", async ({
        page,
      }) => {
        // Arrange
        const image = page.getByAltText("product_photo");
        await expect(image).toHaveAttribute(
          "src",
          /\/api\/v1\/product\/product-photo\//,
        );

        // Act
        await page
          .locator('input[type="file"]')
          .setInputFiles("tests/fixtures/test-image.png");
        await page.getByText("test-image.png").waitFor();

        // Assert
        await expect(image).toHaveAttribute("src", /^blob:/);
      });
    });

    test.describe("Product Update", () => {
      test("should update product successfully with valid inputs", async ({
        request,
        page,
      }) => {
        // Arrange - create a dedicated product for this test to avoid mutating shared seed data
        const createResponse = await request.post(
          "/api/v1/product/create-product",
          {
            multipart: {
              name: `Update Target ${deviceName}`,
              description: "Temporary product for update test",
              price: 10,
              category: electronicsCategoryId,
              quantity: 10,
              shipping: true,
            },
            headers: { Authorization: `Bearer ${authData.token}` },
          },
        );

        expect(createResponse.ok()).toBeTruthy();
        const createdProductPayload = await createResponse.json();
        const createdProduct = createdProductPayload.products;

        await page.goto(`/dashboard/admin/product/${createdProduct.slug}`);

        const productPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/product/update-product/") &&
            response.request().method() === "PUT",
        );

        // Act
        await page
          .getByPlaceholder("write a name")
          .fill("Updated Product Name");
        await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

        // Assert
        await expect(
          page.getByText("Product Updated Successfully"),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/dashboard\/admin\/products$/);

        const productResponse = await productPromise;
        const productData = await productResponse.json();
        const productId = productData.products._id;

        // Clean up test product
        const response = await request.delete(
          `/api/v1/product/delete-product/${productId}`,
          { headers: { Authorization: `Bearer ${authData.token}` } },
        );
        expect(response.ok()).toBeTruthy();
      });

      test("should display error when product update fails", async ({
        page,
      }) => {
        // Arrange
        await page.route(
          "/api/v1/product/update-product/*",
          async (route) => await route.abort(),
        );

        // Act
        await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

        // Assert
        await page.getByText("Something went wrong").waitFor();
        await expect(page).toHaveURL(/\/dashboard\/admin\/product\//);
      });
    });

    test.describe("Product Deletion", () => {
      test("should cancel deletion when confirmation is rejected", async ({
        page,
      }) => {
        // Arrange
        let deleteRequestSent = false;
        page.on("request", (request) => {
          if (
            request.method() === "DELETE" &&
            request.url().includes("/api/v1/product/delete-product/")
          ) {
            deleteRequestSent = true;
          }
        });

        page.once("dialog", async (dialog) => await dialog.dismiss());

        // Act
        await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

        // Assert
        await expect(page).toHaveURL(/\/dashboard\/admin\/product\//);
        expect(deleteRequestSent).toBeFalsy();
      });

      test("should delete product successfully when confirmation is accepted", async ({
        page,
        request,
      }) => {
        // Arrange - create a product to delete
        const response = await request.post("/api/v1/product/create-product", {
          multipart: {
            name: "Product to Delete",
            description: "This product will be deleted in the test",
            price: 10,
            category: electronicsCategoryId,
            quantity: 10,
            shipping: true,
          },
          headers: { Authorization: `Bearer ${authData.token}` },
        });

        expect(response.ok()).toBeTruthy();

        // Act
        await page.goto(`/dashboard/admin/product/Product-to-Delete`);

        page.once("dialog", async (dialog) => await dialog.accept("yes"));

        await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

        // Assert
        await expect(
          page.getByText("Product Deleted Successfully"),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/dashboard\/admin\/products$/);
      });

      test("should display error when product deletion fails", async ({
        page,
      }) => {
        // Arrange
        await page.route(
          "/api/v1/product/delete-product/*",
          async (route) => await route.abort(),
        );

        page.once("dialog", async (dialog) => await dialog.accept("yes"));

        // Act
        await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

        // Assert
        await page.getByText("Something went wrong").waitFor();
        await expect(page).toHaveURL(/\/dashboard\/admin\/product\//);
      });
    });
  });
}
