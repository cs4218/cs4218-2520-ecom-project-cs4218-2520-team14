//Name: Shauryan Agrawal
//Student ID: A0265846N

import { test, expect, type Page } from "@playwright/test";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

const adminDashboardPath = "/dashboard/admin";
const loginPathRegex = /\/login$/;
const adminDashboardPathRegex = /\/dashboard\/admin$/;

const adminUserA = {
  name: "Admin Alpha",
  email: "admin.alpha@test.com",
  password: "AdminPass123",
  phone: "91234567",
  address: "Singapore",
  answer: "Football",
  role: 1,
};

const adminUserB = {
  name: "Admin Beta",
  email: "admin.beta@test.com",
  password: "AdminPass456",
  phone: "98765432",
  address: "NUS",
  answer: "Cricket",
  role: 1,
};

const normalUser = {
  name: "Normal User",
  email: "normal.user@test.com",
  password: "UserPass123",
  phone: "81234567",
  address: "Tampines",
  answer: "Tennis",
  role: 0,
};

//Name: Shauryan Agrawal
//Student ID: A0265846N

async function connectTestDbIfNeeded() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URL as string);
  }
}

//Name: Shauryan Agrawal
//Student ID: A0265846N

async function seedUser(user: {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  answer: string;
  role: number;
}) {
  await connectTestDbIfNeeded();

  const hashedPassword = await hashPassword(user.password);

  await userModel.deleteMany({ email: user.email });

  return await new userModel({
    name: user.name,
    email: user.email,
    password: hashedPassword,
    phone: user.phone,
    address: user.address,
    answer: user.answer,
    role: user.role,
  }).save();
}

//Name: Shauryan Agrawal
//Student ID: A0265846N

async function clearSeededUsers() {
  await connectTestDbIfNeeded();
  await userModel.deleteMany({
    email: {
      $in: [adminUserA.email, adminUserB.email, normalUser.email],
    },
  });
}

//Name: Shauryan Agrawal
//Student ID: A0265846N

async function clearAuthInLocalStorage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem("auth");
  });
}

//Name: Shauryan Agrawal
//Student ID: A0265846N

async function mockAdminAuthSuccess(page: Page) {
  await page.route("**/api/v1/auth/admin-auth", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

//Name: Shauryan Agrawal
//Student ID: A0265846N

async function mockAdminAuthUnauthorized(page: Page) {
  await page.route("**/api/v1/auth/admin-auth", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "UnAuthorized Access",
      }),
    });
  });
}

//Name: Shauryan Agrawal
//Student ID: A0265846N

async function mockAdminAuthServerFailure(page: Page) {
  await page.route("**/api/v1/auth/admin-auth", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Server error",
      }),
    });
  });
}

//Name: Shauryan Agrawal
//Student ID: A0265846N
async function mockAdminAuthDelayedSuccess(page: Page, delayMs = 2000) {
  await page.route("**/api/v1/auth/admin-auth", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

//Name: Shauryan Agrawal
//Student ID: A0265846N
async function loginThroughUI(
  page: Page,
  credentials: { email: string; password: string }
) {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "LOGIN FORM" })
  ).toBeVisible();

  await page.getByPlaceholder("Enter Your Email").fill(credentials.email);
  await page.getByPlaceholder("Enter Your Password").fill(credentials.password);
  await page.getByRole("button", { name: /^LOGIN$/ }).click();

  // Wait for success feedback
  await expect(page.locator("body")).toContainText(/login successfully/i, {
    timeout: 10000,
  });

  // Wait until app leaves login page
  await expect(page).not.toHaveURL(loginPathRegex, { timeout: 10000 });

  // Wait until auth is actually persisted to localStorage
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem("auth");
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return !!parsed?.token && !!parsed?.user;
    } catch {
      return false;
    }
  });
}

//Name: Shauryan Agrawal
//Student ID: A0265846N
async function gotoAdminDashboard(page: Page) {
  await page.goto(adminDashboardPath);
}

async function expectAdminDashboardProfile(
  page: Page,
  user: { name: string; email: string; phone: string }
) {
  await expect(page.locator("body")).toContainText(
    new RegExp(`Admin Name\\s*:\\s*${user.name}`)
  );
  await expect(page.locator("body")).toContainText(
    new RegExp(`Admin Email\\s*:\\s*${user.email}`)
  );
  await expect(page.locator("body")).toContainText(
    new RegExp(`Admin Contact\\s*:\\s*${user.phone}`)
  );
}

//Name: Shauryan Agrawal
//Student ID: A0265846N
async function expectAdminMenuVisible(page: Page) {
  await expect(page.locator("body")).toContainText(/Admin Panel/);
  await expect(page.getByRole("link", { name: "Create Category" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Product" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
}

//Name: Shauryan Agrawal
//Student ID: A0265846N
test.describe("UI Testing: Admin Dashboard Access, Rendering, Navigation, and Admin Login Flow", () => {
  test.beforeEach(async () => {
    await clearSeededUsers();
  });

  test.afterAll(async () => {
    await clearSeededUsers();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Access Control via AdminRoute (Admin-only gate)", () => {
    test("When a valid admin logs in through the real Login page, the dashboard is accessible and renders successfully", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      await expect(page).toHaveURL(adminDashboardPathRegex);
      await expectAdminMenuVisible(page);
      await expectAdminDashboardProfile(page, adminUserA);
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("When a non-admin logs in successfully, access to admin dashboard is denied and user is redirected to login", async ({
      page,
    }) => {
      await seedUser(normalUser);
      await mockAdminAuthUnauthorized(page);

      await loginThroughUI(page, {
        email: normalUser.email,
        password: normalUser.password,
      });

      await gotoAdminDashboard(page);

      await expect(page).toHaveURL(loginPathRegex);
      await expect(page.locator("body")).not.toContainText("Admin Panel");
      await expect(page.locator("body")).not.toContainText("Admin Name :");
      await expect(page.locator("body")).not.toContainText("Admin Email :");
      await expect(page.locator("body")).not.toContainText("Admin Contact :");
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Loading State During Authorization Check (Spinner behaviour)", () => {
    test("While the admin authorization request is pending, a spinner/loading indicator is shown before dashboard content renders", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthDelayedSuccess(page, 2500);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      const possibleSpinner = page
        .locator('[role="status"], .spinner-border, .spinner-grow')
        .first();

      await expect(possibleSpinner).toBeVisible({ timeout: 3000 });

      await expect(page).toHaveURL(adminDashboardPathRegex, { timeout: 10000 });
      await expectAdminMenuVisible(page);
      await expectAdminDashboardProfile(page, adminUserA);
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Admin Profile Information Rendering (AdminDashboard content)", () => {
    test("Dashboard displays correct admin profile fields for one seeded admin who logs in through the UI", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      await expect(page).toHaveURL(adminDashboardPathRegex, { timeout: 10000 });
      await expectAdminDashboardProfile(page, adminUserA);
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Dashboard reflects correct values for a different seeded admin user after real login", async ({
      page,
    }) => {
      await seedUser(adminUserB);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserB.email,
        password: adminUserB.password,
      });

      await gotoAdminDashboard(page);

      await expect(page).toHaveURL(adminDashboardPathRegex, { timeout: 10000 });
      await expectAdminDashboardProfile(page, adminUserB);
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Admin Menu Presence & Link Interactions (AdminMenu as a navigation widget)", () => {
    test("Admin Panel menu is visible and all expected admin links are rendered after admin login", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      await expect(page).toHaveURL(adminDashboardPathRegex, { timeout: 10000 });
      await expectAdminMenuVisible(page);
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Create Category link is interactable and routes to the correct admin page", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      const link = page.getByRole("link", { name: "Create Category" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/dashboard/admin/create-category");
      await link.click();

      await expect(page).toHaveURL(/\/dashboard\/admin\/create-category$/, {
        timeout: 10000,
      });
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Create Product link is interactable and routes to the correct admin page", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      const link = page.getByRole("link", { name: "Create Product" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/dashboard/admin/create-product");
      await link.click();

      await expect(page).toHaveURL(/\/dashboard\/admin\/create-product$/, {
        timeout: 10000,
      });
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Products link is interactable and routes to the correct admin page", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      const link = page.getByRole("link", { name: "Products" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/dashboard/admin/products");
      await link.click();

      await expect(page).toHaveURL(/\/dashboard\/admin\/products$/, {
        timeout: 10000,
      });
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Orders link is interactable and routes to the correct admin page", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      const link = page.getByRole("link", { name: "Orders" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/dashboard/admin/orders");
      await link.click();

      await expect(page).toHaveURL(/\/dashboard\/admin\/orders$/, {
        timeout: 10000,
      });
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Users link is interactable and routes to the correct admin page", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      const link = page.getByRole("link", { name: "Users" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "/dashboard/admin/users");
      await link.click();

      await expect(page).toHaveURL(/\/dashboard\/admin\/users$/, {
        timeout: 10000,
      });
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Missing/Invalid Session Handling (localStorage/auth absence)", () => {
    test("If no valid auth data exists, admin dashboard content does not render and user is not treated as authenticated", async ({
      page,
    }) => {
      await clearAuthInLocalStorage(page);
      await mockAdminAuthUnauthorized(page);

      await gotoAdminDashboard(page);

      await expect(page).toHaveURL(loginPathRegex);
      await expect(page.locator("body")).not.toContainText("Admin Panel");
      await expect(page.locator("body")).not.toContainText("Admin Name :");
      await expect(page.locator("body")).not.toContainText("Admin Email :");
      await expect(page.locator("body")).not.toContainText("Admin Contact :");
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Error Handling for Authorization API Failures", () => {
    test("If admin authorization API fails, the user is redirected to login with secure fail-closed behaviour", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthServerFailure(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      await expect(page).toHaveURL(loginPathRegex);
      await expect(page.locator("body")).not.toContainText("Admin Panel");
      await expect(page.locator("body")).not.toContainText("Admin Name :");
      await expect(page.locator("body")).not.toContainText("Admin Email :");
      await expect(page.locator("body")).not.toContainText("Admin Contact :");
    });
  });
//Name: Shauryan Agrawal
//Student ID: A0265846N
  test.describe("Additional full-flow admin UI hardening coverage", () => {
    test("Dashboard content and admin menu both appear only after successful admin login and authorization", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await gotoAdminDashboard(page);

      await expect(page).toHaveURL(adminDashboardPathRegex, { timeout: 10000 });
      await expectAdminMenuVisible(page);
      await expectAdminDashboardProfile(page, adminUserA);
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Direct access to an admin child route remains accessible after valid admin login", async ({
      page,
    }) => {
      await seedUser(adminUserA);
      await mockAdminAuthSuccess(page);

      await loginThroughUI(page, {
        email: adminUserA.email,
        password: adminUserA.password,
      });

      await page.goto("/dashboard/admin/users");

      await expect(page).toHaveURL(/\/dashboard\/admin\/users$/, {
        timeout: 10000,
      });
    });
//Name: Shauryan Agrawal
//Student ID: A0265846N
    test("Direct access to an admin child route is denied for a logged-in non-admin user", async ({
      page,
    }) => {
      await seedUser(normalUser);
      await mockAdminAuthUnauthorized(page);

      await loginThroughUI(page, {
        email: normalUser.email,
        password: normalUser.password,
      });

      await page.goto("/dashboard/admin/users");

      await expect(page).toHaveURL(loginPathRegex);
    });
  });
});