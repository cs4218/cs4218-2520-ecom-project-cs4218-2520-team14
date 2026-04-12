jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../components/Layout", () => {
  const React = require("react");
  return ({ children, title }) => (
    <div data-testid="layout" data-title={title}>
      {children}
    </div>
  );
});

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, className }) => (
    <a href={to} className={className} data-testid="mock-link">
      {children}
    </a>
  ),
  useNavigate: () => jest.fn(),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import Categories from "../Categories";
import useCategory from "../hooks/useCategory";

describe("Categories - Expansion Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders categories when useCategory returns a non-empty array", () => {
    useCategory.mockReturnValue([
      { _id: "1", name: "Category 1", slug: "category-1" },
      { _id: "2", name: "Category 2", slug: "category-2" },
    ]);

    render(<Categories />);

    expect(screen.getByTestId("layout")).toHaveAttribute("data-title", "All Categories");

    const categoryItems = screen.getAllByTestId("category-item");
    expect(categoryItems).toHaveLength(2);

    const categoryLinks = screen.getAllByTestId("mock-link");
    expect(categoryLinks).toHaveLength(2);
    expect(screen.getByText("Category 1")).toBeInTheDocument();
    expect(screen.getByText("Category 2")).toBeInTheDocument();
    expect(categoryLinks[0]).toHaveAttribute("href", "/category/category-1");
    expect(categoryLinks[1]).toHaveAttribute("href", "/category/category-2");
  });

  test("renders without categories when useCategory returns an empty array", () => {
    useCategory.mockReturnValue([]);

    render(<Categories />);

    expect(screen.getByTestId("layout")).toHaveAttribute("data-title", "All Categories");

    expect(screen.queryByTestId("category-item")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("mock-link")).toHaveLength(0);
    expect(screen.queryByText("Category 1")).not.toBeInTheDocument();
  });
});