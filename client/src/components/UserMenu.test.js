import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserMenu from "./UserMenu";
import React from "react";

const renderUserMenu = () =>
  render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>,
  );

describe("UserMenu Component", () => {
  it("should render correctly", async () => {
    // Arrange & Act
    renderUserMenu();

    // Assert
    await screen.findByText("Dashboard");
  });

  it("should render the Profile link", async () => {
    // Arrange & Act
    renderUserMenu();

    // Assert
    await screen.findByText("Profile");
  });

  it("should render the Orders link", async () => {
    // Arrange & Act
    renderUserMenu();

    // Assert
    await screen.findByText("Orders");
  });

  it("should have the correct link for Profile", async () => {
    // Arrange & Act
    renderUserMenu();

    // Assert
    expect(
      await screen.findByRole("link", { name: "Profile" }),
    ).toHaveAttribute("href", "/dashboard/user/profile");
  });

  it("should have the correct link for Orders", async () => {
    // Arrange & Act
    renderUserMenu();

    // Assert
    expect(await screen.findByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/dashboard/user/orders",
    );
  });
});
