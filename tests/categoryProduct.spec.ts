import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/category/clothing");
});

test.describe("CategoryProduct page", () => {
  test("should render category heading and result count", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /category - clothing/i })
    ).toBeVisible();

    await expect(page.getByText(/4 results? found/i)).toBeVisible();
  });

    test("should render products in the category", async ({ page }) => {
    await expect(page.getByText("Test Clothing 1")).toBeVisible();
    await expect(page.getByText("Test Clothing 2")).toBeVisible();
    await expect(page.getByText("Test Clothing 3")).toBeVisible();
    await expect(page.getByText("Test Clothing 4")).toBeVisible();

    await expect(page.getByRole("heading", { name: /^\$30\.00$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^\$200\.00$/ })).toHaveCount(3);
    });

  test("should add category product to cart in localStorage", async ({ page }) => {
    const firstCard = page.locator(".card").filter({ hasText: "Test Clothing 1" }).first();

    await firstCard.getByRole("button", { name: /add to cart/i }).click();

    const cart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cart") || "[]")
    );

    expect(cart).toHaveLength(1);
    expect(cart[0].name).toBe("Test Clothing 1");
    expect(cart[0].slug).toBe("test-clothing-1");
  });

  test("should navigate to product details page when More Details is clicked", async ({ page }) => {
    const firstCard = page.locator(".card").filter({ hasText: "Test Clothing 1" }).first();

    await firstCard.getByRole("button", { name: /more details/i }).click();

    await expect(page).toHaveURL(/\/product\/test-clothing-1$/);
    await expect(page.getByText(/Name\s*:\s*Test Clothing 1/i)).toBeVisible();
  });

  test("should not show load more button when all products are already visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /load more/i })
    ).toHaveCount(0);
  });
});