// Name: Shauryan Agrawal
// Student ID: A0265846N

import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import AdminMenu from "./AdminMenu";

jest.mock("react-router-dom", () => ({
  NavLink: ({ to, className, children }) => (
    <a href={to} className={className} data-testid={`nav-${to}`}>
      {children}
    </a>
  ),
}));

describe("AdminMenu.js (100% coverage)", () => {
  it("renders Admin Panel title", () => {
    const { getByText } = render(<AdminMenu />);
    expect(getByText("Admin Panel")).toBeInTheDocument();
  });

  it("renders all admin navigation links with correct paths and classes", () => {
    const { getByTestId, getByText } = render(<AdminMenu />);

    const links = [
      ["/dashboard/admin/create-category", "Create Category"],
      ["/dashboard/admin/create-product", "Create Product"],
      ["/dashboard/admin/products", "Products"],
      ["/dashboard/admin/orders", "Orders"],
      ["/dashboard/admin/users", "Users"],
    ];

    links.forEach(([path, label]) => {
      // label rendered
      expect(getByText(label)).toBeInTheDocument();

      // correct route
      const link = getByTestId(`nav-${path}`);
      expect(link).toHaveAttribute("href", path);

      // styling correctness
      expect(link).toHaveClass("list-group-item");
      expect(link).toHaveClass("list-group-item-action");
    });
  });

  it("renders Users navigation link explicitly", () => {
    const { getByText, getByTestId } = render(<AdminMenu />);

    expect(getByText("Users")).toBeInTheDocument();

    const usersLink = getByTestId("nav-/dashboard/admin/users");
    expect(usersLink).toHaveAttribute(
      "href",
      "/dashboard/admin/users"
    );
  });
});
