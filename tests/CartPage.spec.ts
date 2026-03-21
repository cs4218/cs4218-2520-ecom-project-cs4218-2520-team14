/* eslint-disable notice/notice */

// Name: Chia York Lim
// Student ID: A0258147X

import { test, expect } from "@playwright/test";

const viewports = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

const authData = {
  user: {
    _id: "69bbffabbb744c5c6268221e",
    name: "test",
    email: "123@abc.com",
    phone: "1234567890",
    address: "SG",
    role: 0,
  },
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OWJiZmZhYmJiNzQ0YzVjNjI2ODIyMWUiLCJpYXQiOjE3NzQxMTY2MzB9.GiJmKTM8iJQmY33d1OD80Bd7YuUCR6mKyqnmSJ44ZPo",
};

const cartData = [
  {
    _id: "69bc02ccfa39fd252f33d57b",
    name: "The Great Gatsby",
    slug: "the-great-gatsby",
    description: "Classic novel by F. Scott Fitzgerald",
    price: 10,
    category: "69bc02ccfa39fd252f33d573",
    quantity: 100,
    shipping: true,
    createdAt: "2026-03-19T14:06:04.326Z",
    updatedAt: "2026-03-19T14:06:04.326Z",
    __v: 0,
  },
  {
    _id: "69bc02ccfa39fd252f33d57a",
    name: "iPhone 13",
    slug: "iphone-13",
    description: "Latest Apple iPhone with A15 Bionic chip",
    price: 20,
    category: "69bc02ccfa39fd252f33d572",
    quantity: 20,
    shipping: true,
    createdAt: "2026-03-19T14:06:04.326Z",
    updatedAt: "2026-03-19T14:06:04.326Z",
    __v: 0,
  },
];

test.describe.configure({ mode: "parallel" });

for (const [device, viewport] of Object.entries(viewports)) {
  test.describe(`Cart Page - ${device}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.evaluate(() => {
        localStorage.clear();
      });
      await page.goto("/cart");
    });

    test.afterEach(async ({ page }) => {
      await page.evaluate(() => {
        localStorage.clear();
      });
    });

    test("should display cart summary section", async ({ page }) => {
      await expect(page.getByText("Cart Summary")).toBeVisible();
      await expect(page.getByText("Total | Checkout | Payment")).toBeVisible();
    });

    test("should display the cart page (No Auth, Empty Cart)", async ({
      page,
    }) => {
      await expect(page.getByText("Hello Guest")).toBeVisible();
      await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
      await expect(page.getByText("$0.00")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Please Login to checkout" }),
      ).toBeVisible();
    });

    test("should display the cart page (Auth, Empty Cart)", async ({
      page,
    }) => {
      await page.evaluate((authData) => {
        localStorage.setItem("auth", JSON.stringify(authData));
      }, authData);
      await page.reload();

      await expect(page.getByText("Hello test")).toBeVisible();
      await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
      await expect(page.getByText("$0.00")).toBeVisible();
      await expect(page.getByText("Current Address")).toBeVisible();
      await expect(page.getByText(authData.user.address)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Update Address" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Make Payment" }),
      ).not.toBeVisible();
    });

    test("should display the cart page (No Auth, Non-Empty Cart)", async ({
      page,
    }) => {
      await page.evaluate((cartData) => {
        localStorage.setItem("cart", JSON.stringify(cartData));
      }, cartData);
      await page.reload();

      await expect(page.getByText("Hello Guest")).toBeVisible();
      await expect(
        page.getByText(
          "You Have 2 items in your cart please login to checkout !",
        ),
      ).toBeVisible();
      await expect(page.getByText("$30.00")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Please Login to checkout" }),
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: "Make Payment" }),
      ).not.toBeVisible();
    });

    test("should render cart items correctly", async ({ page }) => {
      await page.evaluate((cartData) => {
        localStorage.setItem("cart", JSON.stringify(cartData));
      }, cartData);
      await page.reload();

      await expect(page.getByTestId("cart-item")).toHaveCount(cartData.length);
      await expect(page.getByTestId("cart-item").nth(0)).toContainText(
        cartData[0].name,
      );
      await expect(page.getByTestId("cart-item").nth(0)).toContainText(
        cartData[0].price.toString(),
      );
      await expect(page.getByTestId("cart-item").nth(0)).toContainText(
        cartData[0].description.substring(0, 30),
      );
      await expect(
        page.getByTestId("cart-item").nth(0).getByRole("img"),
      ).toHaveAttribute(
        "src",
        `/api/v1/product/product-photo/${cartData[0]._id}`,
      );
      await expect(
        page
          .getByTestId("cart-item")
          .nth(0)
          .getByRole("button", { name: "Remove" }),
      ).toBeVisible();
    });

    test("should display the cart page (Auth (No Address), Non-Empty Cart)", async ({
      page,
    }) => {
      const { address, ...userWithoutAddress } = authData.user;
      const authDataNoAddress = {
        ...authData,
        user: userWithoutAddress,
      };
      await page.evaluate((cartData) => {
        localStorage.setItem("cart", JSON.stringify(cartData));
      }, cartData);
      await page.evaluate((authDataNoAddress) => {
        localStorage.setItem("auth", JSON.stringify(authDataNoAddress));
      }, authDataNoAddress);
      await page.reload();

      await expect(page.getByText("Hello test")).toBeVisible();
      await expect(
        page.getByText("You Have 2 items in your cart"),
      ).toBeVisible();
      await expect(page.getByText("$30.00")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Update Address" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Make Payment" }),
      ).toBeDisabled();
    });

    test("should display the cart page (Auth (With Address), Non-Empty Cart)", async ({
      page,
    }) => {
      await page.evaluate((cartData) => {
        localStorage.setItem("cart", JSON.stringify(cartData));
      }, cartData);
      await page.evaluate((authData) => {
        localStorage.setItem("auth", JSON.stringify(authData));
      }, authData);
      await page.reload();
      await expect(page.getByText("Hello test")).toBeVisible();
      await expect(
        page.getByText("You Have 2 items in your cart"),
      ).toBeVisible();
      await expect(page.getByText("$30.00")).toBeVisible();
      await expect(page.getByText("Current Address")).toBeVisible();
      await expect(page.getByText(authData.user.address)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Update Address" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Make Payment" }),
      ).toBeEnabled();
    });

    test("should navigate to login page when 'Please Login to checkout' button is clicked", async ({
      page,
    }) => {
      await page
        .getByRole("button", { name: "Please Login to checkout" })
        .click();
      await expect(page).toHaveURL("/login");
    });

    test("should navigate to update address page when 'Update Address' button is clicked (No Address)", async ({
      page,
    }) => {
      const { address, ...userWithoutAddress } = authData.user;
      const authDataNoAddress = {
        ...authData,
        user: userWithoutAddress,
      };
      await page.evaluate((authDataNoAddress) => {
        localStorage.setItem("auth", JSON.stringify(authDataNoAddress));
      }, authDataNoAddress);
      await page.reload();

      await page.getByRole("button", { name: "Update Address" }).click();
      await expect(page).toHaveURL("/dashboard/user/profile");
    });

    test("should navigate to update address page when 'Update Address' button is clicked (With Address)", async ({
      page,
    }) => {
      await page.evaluate((authData) => {
        localStorage.setItem("auth", JSON.stringify(authData));
      }, authData);
      await page.reload();
      await page.getByRole("button", { name: "Update Address" }).click();
      await expect(page).toHaveURL("/dashboard/user/profile");
    });

    test("should be able to remove item from cart", async ({ page }) => {
      await page.evaluate((cartData) => {
        localStorage.setItem("cart", JSON.stringify(cartData));
      }, cartData);
      await page.reload();

      await page.getByTestId("cart-item").nth(0).getByRole("button").click();
      await expect(page.getByTestId("cart-item")).toHaveCount(
        cartData.length - 1,
      );
      await expect(page.getByText("$20.00")).toBeVisible();
      const cart = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem("cart") || "[]");
      });
      expect(cart).toHaveLength(1);
      expect(cart).toEqual(cartData.slice(1));
    });

    test("should display 'Your Cart Is Empty' after removing all items from cart", async ({
      page,
    }) => {
      await page.evaluate((cartData) => {
        localStorage.setItem("cart", JSON.stringify(cartData));
      }, cartData);
      await page.reload();

      const cartItems = page.getByTestId("cart-item");
      const itemCount = await cartItems.count();
      for (let i = 0; i < itemCount; i++) {
        await cartItems.nth(0).getByRole("button").click();
      }
      await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
      await expect(page.getByText("$0.00")).toBeVisible();
      const cart = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem("cart") || "[]");
      });
      expect(cart).toHaveLength(0);
    });

    test("should be able to checkout", async ({ page }) => {
      await page.route("**/api/v1/product/braintree/token", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ clientToken: "fake-client-token" }),
        });
      });

      await page.route("**/api/v1/product/braintree/payment", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      });
      await page.evaluate((cartData) => {
        localStorage.setItem("cart", JSON.stringify(cartData));
      }, cartData);
      await page.evaluate((authData) => {
        localStorage.setItem("auth", JSON.stringify(authData));
      }, authData);
      await page.reload();
      await page.getByRole("button", { name: "Make Payment" }).click();

      await expect(page).toHaveURL("/dashboard/user/orders");
      await expect(
        page.getByText("Payment Completed Successfully "),
      ).toBeVisible();

      const cart = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem("cart") || "[]");
      });
      expect(cart).toHaveLength(0);
    });
  });
}
