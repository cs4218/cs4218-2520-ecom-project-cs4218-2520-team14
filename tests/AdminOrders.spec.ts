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
  await page.goto("/dashboard/admin/orders");
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

    test.describe("Order Retrieval and Display", () => {
      test("should display orders on page load", async ({ page }) => {
        // Arrange
        const ordersPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/auth/all-orders") &&
            response.request().method() === "GET",
        );

        // Act
        await page.reload();

        // Assert
        const ordersResponse = await ordersPromise;
        const ordersData = await ordersResponse.json();

        await page.getByRole("heading", { name: "All Orders" }).waitFor();
        await expect(page.locator(".border.shadow")).toHaveCount(
          ordersData.length,
        );
      });

      test("should display correct order metadata", async ({ page }) => {
        // Arrange
        const ordersPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/auth/all-orders") &&
            response.request().method() === "GET",
        );

        // Act
        await page.reload();

        // Assert
        const ordersResponse = await ordersPromise;
        const ordersData = await ordersResponse.json();

        for (const [index, order] of ordersData.entries()) {
          const orderContainer = page.locator(".border.shadow").nth(index);

          // Check buyer name is displayed in the table (3rd column: 0-index is 2)
          const buyerCell = orderContainer.locator("table tbody tr td").nth(2);
          await expect(buyerCell).toContainText(order.buyer.name);

          // Check payment status is displayed (5th column: 0-index is 4)
          const paymentStatus = order.payment.success ? "Success" : "Failed";
          const paymentCell = orderContainer
            .locator("table tbody tr td")
            .nth(4);
          await expect(paymentCell).toContainText(paymentStatus);

          // Check quantity (number of products) is displayed (6th column: 0-index is 5)
          const quantityCell = orderContainer
            .locator("table tbody tr td")
            .nth(5);
          await expect(quantityCell).toContainText(
            String(order.products.length),
          );
        }
      });

      test("should handle empty orders list", async ({ page }) => {
        // Arrange
        await page.route("/api/v1/auth/all-orders", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        });

        // Act
        await page.reload();

        // Assert
        await page.getByRole("heading", { name: "All Orders" }).waitFor();
        await expect(page.locator(".border.shadow")).toHaveCount(0);
      });

      test("should handle order retrieval failure", async ({ page }) => {
        // Arrange
        await page.route(
          "/api/v1/auth/all-orders",
          async (route) => await route.abort(),
        );

        // Act
        await page.reload();

        // Assert
        await page.getByRole("heading", { name: "All Orders" }).waitFor();
        await expect(page.locator(".border.shadow")).toHaveCount(0);
      });
    });

    test.describe("Order Product Display", () => {
      test("should display products within each order", async ({ page }) => {
        // Arrange
        const ordersPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/auth/all-orders") &&
            response.request().method() === "GET",
        );

        // Act
        await page.reload();

        // Assert
        const ordersResponse = await ordersPromise;
        const ordersData = await ordersResponse.json();

        const firstOrder = ordersData[0];
        const firstProduct = firstOrder.products[0];
        const firstOrderContainer = page.locator(".border.shadow").nth(0);

        // Check product name is displayed in first order
        await firstOrderContainer
          .getByText(firstProduct.name, { exact: true })
          .waitFor();

        // Check truncated description is displayed (first 30 chars)
        const truncatedDesc = firstProduct.description.substring(0, 30);
        await firstOrderContainer.getByText(truncatedDesc).waitFor();

        // Check price is displayed
        await firstOrderContainer
          .getByText(`Price : ${firstProduct.price}`)
          .waitFor();
      });

      test("should display product image correctly", async ({ page }) => {
        // Arrange
        const ordersPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/auth/all-orders") &&
            response.request().method() === "GET",
        );

        // Act
        await page.reload();

        // Assert
        const ordersResponse = await ordersPromise;
        const ordersData = await ordersResponse.json();

        const firstOrder = ordersData[0];
        const firstProduct = firstOrder.products[0];
        const firstOrderContainer = page.locator(".border.shadow").nth(0);

        // Check product image in first order's first product
        const productImage = firstOrderContainer.locator(
          `img[alt="${firstProduct.name}"]`,
        );
        await expect(productImage).toHaveAttribute(
          "src",
          `/api/v1/product/product-photo/${firstProduct._id}`,
        );
      });
    });

    test.describe("Order Status Dropdown", () => {
      test("should display current order status", async ({ page }) => {
        // Arrange
        const ordersPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/auth/all-orders") &&
            response.request().method() === "GET",
        );

        // Act
        await page.reload();

        // Assert
        const ordersResponse = await ordersPromise;
        const ordersData = await ordersResponse.json();

        const firstOrder = ordersData[0];
        const firstOrderContainer = page.locator(".border.shadow").nth(0);
        const statusDropdown = firstOrderContainer.locator(".ant-select");

        // Check that the dropdown displays the current status
        await expect(statusDropdown).toContainText(firstOrder.status);
      });

      test("should display all available status options", async ({ page }) => {
        // Arrange
        const expectedStatuses = [
          "Not Processed",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
        ];
        const firstOrderContainer = page.locator(".border.shadow").nth(0);
        const firstStatusDropdown = firstOrderContainer.locator(".ant-select");

        // Act - Click on the first order's status dropdown to open it
        await firstStatusDropdown.click();

        // Assert - Check all statuses are available in the dropdown
        for (const status of expectedStatuses) {
          await page.locator("div").and(page.getByTitle(status)).waitFor();
        }
      });
    });

    test.describe("Order Status Update", () => {
      test("should successfully update order status", async ({
        page,
        request,
      }) => {
        // Arrange - capture original order ID and status from initial request
        const ordersPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/auth/all-orders") &&
            response.request().method() === "GET",
        );

        await page.reload();

        const ordersResponse = await ordersPromise;
        const ordersData = await ordersResponse.json();
        const firstOrder = ordersData[0];
        const orderId = firstOrder._id;
        const originalStatus = firstOrder.status;

        const firstOrderContainer = page.locator(".border.shadow").nth(0);
        const statusDropdown = firstOrderContainer.locator(".ant-select");

        const updatePromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/auth/order-status/") &&
            response.request().method() === "PUT",
        );

        // Act - Click on the first order's status dropdown and select a new status
        await statusDropdown.click();
        const newStatus = "Shipped";
        await page.locator("div").and(page.getByTitle(newStatus)).click();

        // Assert
        const updateResponse = await updatePromise;
        expect(updateResponse.ok()).toBeTruthy();

        await expect(statusDropdown).toContainText(newStatus);

        // Cleanup - revert status back to original using captured ID and status
        const revertResponse = await request.put(
          `/api/v1/auth/order-status/${orderId}`,
          {
            headers: { Authorization: `Bearer ${authData.token}` },
            data: { status: originalStatus },
          },
        );
        expect(revertResponse.ok()).toBeTruthy();
      });

      test("should handle order status update failure", async ({ page }) => {
        // Arrange
        const ordersPromise = page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/auth/all-orders") &&
            response.request().method() === "GET",
        );

        await page.reload();

        const ordersResponse = await ordersPromise;
        const firstOrder = (await ordersResponse.json())[0];
        const firstOrderContainer = page.locator(".border.shadow").nth(0);
        const statusDropdown = firstOrderContainer.locator(".ant-select");

        await page.route(
          `/api/v1/auth/order-status/${firstOrder._id}`,
          async (route) => await route.abort(),
        );

        // Act - Click on the first order's status dropdown and try to select a new status
        await statusDropdown.click();
        const newStatus = "Shipped";
        await page.locator("div").and(page.getByTitle(newStatus)).click();

        // Assert - The page should still be functional and show the original status
        await page.getByText("Failed to update order status").waitFor();
      });
    });
  });
}
