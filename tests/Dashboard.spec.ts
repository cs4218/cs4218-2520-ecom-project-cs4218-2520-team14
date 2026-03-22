// Jonas Ong, A0252052U

import test, { expect } from "@playwright/test";
import jsonwebtoken from "jsonwebtoken";

const authData = {
  user: {
    _id: "69bbffabbb744c5c6268221e",
    name: "test",
    email: "123@abc.com",
    phone: "1234567890",
    address: "SG",
    role: 0,
  },
  token: jsonwebtoken.sign(
    { _id: "69bbffabbb744c5c6268221e" },
    process.env.JWT_SECRET,
  ),
};

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard/user");
  await page.evaluate(
    (auth) => localStorage.setItem("auth", JSON.stringify(auth)),
    authData,
  );
  await page.reload();
});

test.describe("Dashboard", () => {
  test("renders with UserMenu correctly and links navigate correctly", async ({
    page,
  }) => {
    // Assert initial dashboard render
    await page.getByRole("heading", { name: "Dashboard" }).waitFor();

    // Act + Assert profile navigation
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);

    // Act + Assert orders navigation
    await page.goto("/dashboard/user");
    await page.getByRole("link", { name: "Orders" }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/orders$/);
  });

  test("displays correct user information", async ({ page }) => {
    // Assert
    await page
      .getByRole("heading", { name: authData.user.name, exact: true })
      .waitFor();
    await page
      .getByRole("heading", { name: authData.user.email, exact: true })
      .waitFor();
    await page
      .getByRole("heading", { name: authData.user.address, exact: true })
      .waitFor();
  });
});
