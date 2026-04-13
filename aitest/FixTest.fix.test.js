import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/cart";
import toast from "react-hot-toast";
import HomePage from "./FixTest";

// Mock dependencies
jest.mock("axios");
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));
jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));
jest.mock("react-hot-toast");
jest.mock("../components/Layout", () => ({ children, title }) => (
  <div data-testid="mock-layout" data-title={title}>
    {children}
  </div>
));
// Mock prices data to match expectations in component
jest.mock("../components/Prices", () => ({
  Prices: [
    { _id: "1", name: "$0 to 19", array: [0, 19] },
    { _id: "2", name: "$20 to 39", array: [20, 39] },
  ],
}));

// Utility to setup mock local storage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => (store[key] = value.toString()),
    clear: () => (store = {}),
  };
})();
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

// Mock window.location.reload
const originalLocation = window.location;

delete window.location;
window.location = { ...originalLocation, reload: jest.fn() };

describe("HomePage Component Unit Tests", () => {
  const mockNavigate = jest.fn();
  const mockSetCart = jest.fn();
  const mockCategories = [
    { _id: "cat1", name: "Electronics", slug: "electronics" },
    { _id: "cat2", name: "Clothing", slug: "clothing" },
  ];
  const mockProducts = [
    {
      _id: "p1",
      name: "iPhone 15",
      slug: "iphone-15",
      description: "The latest iPhone with amazing features.",
      price: 999,
      category: "cat1",
    },
    {
      _id: "p2",
      name: "Laptop",
      slug: "laptop",
      description: "High performance laptop for gaming.",
      price: 1500,
      category: "cat1",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useCart.mockReturnValue([[], mockSetCart]);
    
    // Default successful API responses
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") return Promise.resolve({ data: { success: true, category: mockCategories } });
      if (url === "/api/v1/product/product-count") return Promise.resolve({ data: { total: 2 } });
      if (url.includes("/api/v1/product/product-list/")) return Promise.resolve({ data: { products: mockProducts } });
      return Promise.reject(new Error("Not Found"));
    });
    
    axios.post.mockResolvedValue({ data: { products: mockProducts } });
  });

  afterEach(cleanup);

  test("should render initial state with categories and products", async () => {
    render(<HomePage />);

    expect(screen.getByText("Filter By Category")).toBeInTheDocument();
    expect(screen.getByText("All Products")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("iPhone 15")).toBeInTheDocument();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-count");
  });

  test("should handle category filter changes", async () => {
    render(<HomePage />);

    await waitFor(() => screen.getByText("Electronics"));

    const checkbox = screen.getByLabelText("Electronics");
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
        checked: ["cat1"],
        radio: [],
      });
    });
  });

  test("should handle price filter changes", async () => {
    render(<HomePage />);

    const radioOption = screen.getByLabelText("$0 to 19");
    fireEvent.click(radioOption);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
        checked: [],
        radio: [0, 19],
      });
    });
  });

  test("should navigate to product details on clicking More Details", async () => {
    render(<HomePage />);

    await waitFor(() => screen.getAllByText("More Details"));
    const detailsBtns = screen.getAllByText("More Details");
    fireEvent.click(detailsBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/product/iphone-15");
  });

  test("should add item to cart and show toast on success", async () => {
    render(<HomePage />);

    await waitFor(() => screen.getAllByText("ADD TO CART"));
    const addToCartBtns = screen.getAllByText("ADD TO CART");
    
    fireEvent.click(addToCartBtns[0]);

    expect(mockSetCart).toHaveBeenCalledWith([mockProducts[0]]);
    expect(localStorage.getItem("cart")).toBe(JSON.stringify([mockProducts[0]]));
    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
  });

  test("should load more products when loadmore button is clicked", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") return Promise.resolve({ data: { success: true, category: mockCategories } });
      if (url === "/api/v1/product/product-count") return Promise.resolve({ data: { total: 4 } }); // Total higher than current load
      if (url.includes("/api/v1/product/product-list/")) return Promise.resolve({ data: { products: mockProducts } });
      return Promise.reject(new Error("Not Found"));
    });

    render(<HomePage />);

    await waitFor(() => screen.getByText("Loadmore"));
    const loadMoreBtn = screen.getByText("Loadmore");
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2");
    });
  });

  test("should reload the page when reset filters is clicked", () => {
    render(<HomePage />);
    
    const resetBtn = screen.getByText("RESET FILTERS");
    fireEvent.click(resetBtn);

    expect(window.location.reload).toHaveBeenCalled();
  });

  test("should log error on failed category fetching", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockImplementationOnce(() => Promise.reject("Category API Error"));

    render(<HomePage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Category API Error");
    });
    consoleSpy.mockRestore();
  });

  test("should show loading state in button during loadMore action", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") return Promise.resolve({ data: { success: true, category: mockCategories } });
      if (url === "/api/v1/product/product-count") return Promise.resolve({ data: { total: 4 } });
      if (url.includes("/api/v1/product/product-list/")) {
        // Delay response to check loading state
        return new Promise((resolve) => 
          setTimeout(() => resolve({ data: { products: [] } }), 50)
        );
      }
    });

    render(<HomePage />);
    
    await waitFor(() => screen.getByText("Loadmore"));
    fireEvent.click(screen.getByText("Loadmore"));

    expect(screen.getByText("Loading ...")).toBeInTheDocument();
  });
});