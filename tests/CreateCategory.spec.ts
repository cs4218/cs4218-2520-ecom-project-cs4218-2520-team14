// Jonas Ong, A0252052U

import test from "@playwright/test";

// test.describe.configure({ mode: "parallel" });

const authData = {
  user: {
    _id: "69bbffabbb744c5c6268221e",
    name: "test",
    email: "123@abc.com",
    phone: "1234567890",
    address: "SG",
    role: 1,
  },
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OWJiZmZhYmJiNzQ0YzVjNjI2ODIyMWUiLCJpYXQiOjE3NzQxMTY2MzB9.GiJmKTM8iJQmY33d1OD80Bd7YuUCR6mKyqnmSJ44ZPo",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard/admin/create-category");
  await page.evaluate(
    (authData) => localStorage.setItem("auth", JSON.stringify(authData)),
    authData,
  );
  await page.reload();
});

test.describe("Create Category", () => {
  test("should fetch categories", async ({ page }) => {
    // Assert
    await page.getByText("Manage Category").waitFor();

    await page.getByRole("cell", { name: "Electronics" }).waitFor();
    await page.getByRole("cell", { name: "Books" }).waitFor();
    await page.getByRole("cell", { name: "Clothing" }).waitFor();
  });

  test("should show error for empty category name", async ({ page }) => {
    // Act
    await page.getByPlaceholder("Enter new category").fill("");
    await page.getByRole("button", { name: "Submit" }).click();

    // Assert
    await page.getByText("Name is required").waitFor();
  });

  test("should show error for duplicate category name", async ({ page }) => {
    // Act
    await page.getByPlaceholder("Enter new category").fill("Electronics");
    await page.getByRole("button", { name: "Submit" }).click();

    // Assert
    await page.getByText("Category Already Exists").waitFor();
  });

  test("should show error if API call fails", async ({ page }) => {
    // Arrange
    await page.route("/api/v1/category/create-category", (route) =>
      route.fulfill({
        body: JSON.stringify({
          success: false,
          message: "Failed to create category",
        }),
      }),
    );

    // Act
    await page.getByPlaceholder("Enter new category").fill("Toys");
    await page.getByRole("button", { name: "Submit" }).click();

    // Assert
    await page.getByText("Failed to create category").waitFor();
  });

  test("should create a new category with a valid name", async ({
    page,
    request,
  }) => {
    // Arrange - listen to the returned catregory ID for cleanup
    const categoryPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/category/create-category") &&
        response.request().method() === "POST",
    );

    // Act
    await page.getByPlaceholder("Enter new category").fill("New category");
    await page.getByRole("button", { name: "Submit" }).click();

    // Assert
    await page.getByRole("cell", { name: "New category" }).waitFor();
    await page.getByText("New category is created").waitFor();

    const categoryResponse = await categoryPromise;
    const categoryData = await categoryResponse.json();
    const categoryId = categoryData.category._id;

    // Clean up by deleting the created category
    await request.delete("/api/v1/category/delete-category/*", {
      data: { id: categoryId },
    });
  });
});

test.describe("Update Category", () => {
  test("modal should open when edit button is clicked", async ({ page }) => {
    // Act
    await page.getByRole("cell", { name: "Books" }).waitFor();
    await page
      .getByRole("cell", { name: "Books" })
      .locator("..")
      .getByRole("button", { name: "Edit" })
      .click();

    // Assert
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" })
      .waitFor();
  });

  test("should show error for empty category name in update modal", async ({
    page,
  }) => {
    // Act
    await page.getByRole("cell", { name: "Books" }).waitFor();
    await page
      .getByRole("cell", { name: "Books" })
      .locator("..")
      .getByRole("button", { name: "Edit" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" })
      .fill("");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit" })
      .click();

    // Assert
    await page.getByText("Name is required").waitFor();
  });

  test("no update when update model is closed", async ({ page }) => {
    // Act
    await page.getByRole("cell", { name: "Books" }).waitFor();
    await page
      .getByRole("cell", { name: "Books" })
      .locator("..")
      .getByRole("button", { name: "Edit" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" })
      .fill("Literature");
    await page.locator("button[aria-label='Close']").click();

    // Assert
    await page.getByRole("cell", { name: "Books" }).waitFor();
  });

  test("should show error if API call fails in update modal", async ({
    page,
  }) => {
    // Arrange
    await page.route("/api/v1/category/update-category/*", (route) =>
      route.fulfill({
        body: JSON.stringify({
          success: false,
          message: "Failed to update category",
        }),
      }),
    );

    // Act
    await page.getByRole("cell", { name: "Books" }).waitFor();
    await page
      .getByRole("cell", { name: "Books" })
      .locator("..")
      .getByRole("button", { name: "Edit" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" })
      .fill("Literature");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit" })
      .click();

    await page.getByText("Failed to update category").waitFor();
  });

  test("should update category with a valid name", async ({
    page,
    request,
  }) => {
    // Arrange - listen to the returned catregory ID for cleanup
    const categoryPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/category/update-category/") &&
        response.request().method() === "PUT",
    );

    // Act
    await page.getByRole("cell", { name: "Books" }).waitFor();
    await page
      .getByRole("cell", { name: "Books" })
      .locator("..")
      .getByRole("button", { name: "Edit" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" })
      .fill("Gadgets");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit" })
      .click();

    // Assert
    await page.getByRole("cell", { name: "Gadgets" }).waitFor();
    await page
      .getByRole("cell", { name: "Books" })
      .waitFor({ state: "detached" });

    // Clean up by renaming the category back to original name
    const categoryResponse = await categoryPromise;
    const categoryData = await categoryResponse.json();
    const categoryId = categoryData.category._id;

    await request.put("/api/v1/category/update-category/*", {
      data: { id: categoryId, name: "Books" },
    });
  });
});

test.describe("Delete Category", () => {
  test("should show error if API call fails when deleting category", async ({
    page,
  }) => {
    // Arrange
    await page.route("/api/v1/category/delete-category/*", (route) =>
      route.fulfill({
        body: JSON.stringify({
          success: false,
          message: "Failed to delete category",
        }),
      }),
    );

    // Act
    await page.getByRole("cell", { name: "Clothing" }).waitFor();
    await page
      .getByRole("cell", { name: "Clothing" })
      .locator("..")
      .getByRole("button", { name: "Delete" })
      .click();

    // Assert
    await page.getByText("Failed to delete category").waitFor();
  });

  test("should delete category when delete button is clicked", async ({
    page,
    request,
  }) => {
    // Arrange - create a category to delete
    await request.post("/api/v1/category/create-category", {
      data: { name: "New category" },
    });
    await page.reload();

    // Act
    await page
      .getByRole("cell", { name: "New category" })
      .locator("..")
      .getByRole("button", { name: "Delete" })
      .click();

    // Assert
    await page
      .getByRole("cell", { name: "New category" })
      .waitFor({ state: "detached" });
  });
});
