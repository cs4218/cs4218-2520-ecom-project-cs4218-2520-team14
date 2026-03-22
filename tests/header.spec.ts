import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("Header component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test("should render brand and logged-out navigation links", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /virtual vault/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^home$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /categories/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^register$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^login$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^cart$/i })).toBeVisible();
  });

  test("should show category dropdown items", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /categories/i }).click();

    await expect(page.getByRole("link", { name: /all categories/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^electronics$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^books$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^clothing$/i })).toBeVisible();
  });

  test("should show cart badge count from localStorage", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "cart",
        JSON.stringify([
          { _id: "1", name: "Item 1", slug: "item-1" },
          { _id: "2", name: "Item 2", slug: "item-2" },
        ])
      );
    });

    await page.goto("/");

    await expect(page.locator(".ant-badge-count")).toContainText("2");
    await expect(page.getByRole("link", { name: /^cart$/i })).toBeVisible();
  });

  test("should show authenticated user navigation when logged in", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          user: {
            name: "Test User",
            role: 0,
          },
          token: "test-token",
        })
      );
    });

    await page.goto("/");

    await expect(page.getByText("Test User")).toBeVisible();
    await expect(page.getByRole("link", { name: /^register$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^login$/i })).toHaveCount(0);

    await page.getByText("Test User").click();

    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /logout/i })).toBeVisible();
  });
});