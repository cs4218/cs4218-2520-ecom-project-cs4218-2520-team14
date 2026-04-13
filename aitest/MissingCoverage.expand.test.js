import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Categories from "../Categories";
import useCategory from "../hooks/useCategory";

jest.mock("../hooks/useCategory");
jest.mock("axios");
jest.mock("../components/Layout", () => ({ children, title }) => (
  <div data-testid="mock-layout" data-title={title}>
    {children}
  </div>
));

describe("CartPage - Expansion Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Logical Branch: categories.map with empty array (0 iterations)
   * Simulates empty state or initial state before hook resolves.
   */
  test("renders zero category items when useCategory returns an empty array", () => {
    useCategory.mockReturnValue([]);
    
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    const layout = screen.getByTestId("mock-layout");
    expect(layout).toBeInTheDocument();
    expect(layout).toHaveAttribute("data-title", "All Categories");
    
    const categoryItems = screen.queryAllByTestId("category-item");
    expect(categoryItems).toHaveLength(0);
  });

  /**
   * Logical Branch: categories.map with multiple items (N iterations)
   * Covers the core rendering logic and Link attribute generation.
   */
  test("renders multiple category items and validates Link path construction", () => {
    const mockCategories = [
      { _id: "1", name: "Electronics", slug: "electronics" },
      { _id: "2", name: "Home Appliances", slug: "home-appliances" },
    ];
    useCategory.mockReturnValue(mockCategories);

    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    const categoryItems = screen.getAllByTestId("category-item");
    expect(categoryItems).toHaveLength(2);

    const link1 = screen.getByRole("link", { name: "Electronics" });
    expect(link1).toHaveAttribute("href", "/category/electronics");
    expect(link1).toHaveClass("btn btn-primary");

    const link2 = screen.getByRole("link", { name: "Home Appliances" });
    expect(link2).toHaveAttribute("href", "/category/home-appliances");
  });

  /**
   * Edge Case Branch: Error simulation
   * Simulates a scenario where the hook might return an empty array due to an HTTP 500 error in the backend.
   */
  test("handles hook returning empty array on simulated HTTP 500 or network failure", () => {
    // Lead QA Note: Even if hook fails internally, component must remain stable.
    useCategory.mockReturnValue([]);
    
    const { container } = render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    const rowContainer = container.querySelector(".row");
    expect(rowContainer).toBeInTheDocument();
    expect(rowContainer.children.length).toBe(0);
  });

  /**
   * CSS/UI Branch: Validates bootstrap class injection
   * Ensures the grid system branches (classes) are correctly applied to mapped items.
   */
  test("applies correct responsive grid classes to category items", () => {
    useCategory.mockReturnValue([{ _id: "1", name: "Test", slug: "test" }]);
    
    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    const item = screen.getByTestId("category-item");
    expect(item).toHaveClass("col-md-6", "mt-5", "mb-3", "gx-3", "gy-3");
  });
});