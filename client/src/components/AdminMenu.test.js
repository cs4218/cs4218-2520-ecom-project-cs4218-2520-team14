//Name: Shauryan Agrawal
//Student ID: A0265846N

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
  it("renders the Admin Panel title", () => {
    const { getByText } = render(<AdminMenu />);
    expect(getByText("Admin Panel")).toBeInTheDocument();
  });

  it("renders all required admin navigation links with correct paths + classes", () => {
    const { getByTestId, getByText } = render(<AdminMenu />);

    const links = [
      ["/dashboard/admin/create-category", "Create Category"],
      ["/dashboard/admin/create-product", "Create Product"],
      ["/dashboard/admin/products", "Products"],
      ["/dashboard/admin/orders", "Orders"],
    ];

    for (const [path, label] of links) {
      // label exists
      expect(getByText(label)).toBeInTheDocument();

      // correct href via mocked NavLink
      const a = getByTestId(`nav-${path}`);
      expect(a).toHaveAttribute("href", path);

      // className correctness (important because you passed it to NavLink)
      expect(a).toHaveClass("list-group-item");
      expect(a).toHaveClass("list-group-item-action");
    }
  });

  it("does NOT render the commented Users link", () => {
    const { queryByText } = render(<AdminMenu />);
    expect(queryByText("Users")).not.toBeInTheDocument();
  });
});
