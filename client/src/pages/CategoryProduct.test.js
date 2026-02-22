
// Author: Tan Qin Yong A0253468W

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import CategoryProduct from "./CategoryProduct"; 
import toast from "react-hot-toast";
import { useCart } from "../context/cart";
import { useParams, useNavigate } from "react-router-dom";

// Mock axios
jest.mock("axios");

// Mock toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Layout to avoid dependencies on Layout internals
jest.mock("../components/Layout", () => {
  return function LayoutMock({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock useCart (context)
const mockSetCart = jest.fn();
jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

describe("CategoryProduct", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useCart.mockReturnValue([[], mockSetCart]);
    localStorage.clear();
  });

  test("renders initial UI (before products load)", () => {
    // Arrange slug exists so effect will run
    useParams.mockReturnValue({ slug: "tshirts" });

    // Make axios pending (never resolves) for this test
    axios.get.mockReturnValue(new Promise(() => {}));

    // Act
    render(<CategoryProduct />);

    // Assert
    expect(screen.getByText(/Category -/i)).toBeInTheDocument();
    expect(screen.getByText("0 result found")).toBeInTheDocument();
  });

  test("calls axios.get with correct category URL when slug exists", async () => {
    // Arrange
    useParams.mockReturnValue({ slug: "tshirts" });

    axios.get.mockResolvedValueOnce({
      data: {
        category: { name: "T-Shirts" },
        products: [],
      },
    });

    // Act
    render(<CategoryProduct />);

    // Assert 
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-category/tshirts"
      );
    });
  });

  test("renders category name, count, and product cards after fetch", async () => {
    // Arrange
    useParams.mockReturnValue({ slug: "tshirts" });

    const fakeProducts = [
      {
        _id: "p1",
        name: "Basic Tee",
        slug: "basic-tee",
        price: 12,
        description: "A very comfy t-shirt that is great for daily wear",
      },
      {
        _id: "p2",
        name: "Graphic Tee",
        slug: "graphic-tee",
        price: 25,
        description: "Limited edition graphic tee with a cool print",
      },
    ];

    axios.get.mockResolvedValueOnce({
      data: {
        category: { name: "T-Shirts" },
        products: fakeProducts,
      },
    });

    // Act
    render(<CategoryProduct />);

    // Assert: category header updates
    expect(await screen.findByText("Category - T-Shirts")).toBeInTheDocument();

    // Count text
    expect(screen.getByText("2 result found")).toBeInTheDocument();

    // Product names rendered
    expect(screen.getByText("Basic Tee")).toBeInTheDocument();
    expect(screen.getByText("Graphic Tee")).toBeInTheDocument();

    // Price formatting
    expect(screen.getByText("$12.00")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();

    // Description substring(0,60) + "..."
    expect(screen.getByText(/A very comfy t-shirt/i)).toBeInTheDocument();
    expect(screen.getByText(/Limited edition graphic tee/i)).toBeInTheDocument();

    // Image src exists (one example)
    const img = screen.getByAltText("Basic Tee");
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
  });

  test("clicking 'More Details' navigates to product detail page", async () => {
    // Arrange
    useParams.mockReturnValue({ slug: "tshirts" });

    axios.get.mockResolvedValueOnce({
      data: {
        category: { name: "T-Shirts" },
        products: [
          {
            _id: "p1",
            name: "Basic Tee",
            slug: "basic-tee",
            price: 12,
            description: "A very comfy t-shirt that is great for daily wear",
          },
        ],
      },
    });

    // Act
    render(<CategoryProduct />);

    // Wait for products to appear
    await screen.findByText("Basic Tee");

    const btn = screen.getByRole("button", { name: /more details/i });
    fireEvent.click(btn);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/product/basic-tee");
  });

  test("clicking 'ADD TO CART' updates cart, localStorage, and shows toast", async () => {
    // Arrange
    useParams.mockReturnValue({ slug: "tshirts" });

    const product = {
      _id: "p1",
      name: "Basic Tee",
      slug: "basic-tee",
      price: 12,
      description: "A very comfy t-shirt that is great for daily wear",
    };

    // start with existing cart item to verify append behavior
    const existingCart = [{ _id: "old" }];
    useCart.mockReturnValue([existingCart, mockSetCart]);

    axios.get.mockResolvedValueOnce({
      data: {
        category: { name: "T-Shirts" },
        products: [product],
      },
    });

    // Act
    render(<CategoryProduct />);

    await screen.findByText("Basic Tee");

    const addBtn = screen.getByRole("button", { name: /add to cart/i });
    fireEvent.click(addBtn);

    // Assert
    expect(mockSetCart).toHaveBeenCalledWith([...existingCart, product]);
    expect(localStorage.getItem("cart")).toBe(JSON.stringify([...existingCart, product]));
    expect(toast.success).toHaveBeenCalled();
  });

  test("shows Loadmore button when more items exist; clicking it reveals more cards", async () => {
    // Arrange
    useParams.mockReturnValue({ slug: "tshirts" });

    // perPage is 6; make 7 items so loadmore appears
    const fakeProducts = Array.from({ length: 7 }).map((_, i) => ({
      _id: `p${i + 1}`,
      name: `Prod ${i + 1}`,
      slug: `prod-${i + 1}`,
      price: 10 + i,
      description: "desc",
    }));

    axios.get.mockResolvedValueOnce({
      data: {
        category: { name: "T-Shirts" },
        products: fakeProducts,
      },
    });

    // Act
    render(<CategoryProduct />);

    // Wait for initial render (first item)
    await screen.findByText("Prod 1");
    expect(screen.queryByText("Prod 7")).not.toBeInTheDocument();

    // Loadmore visible
    const loadBtn = await screen.getByRole("button", { name: /load\s*more/i });
    expect(loadBtn).toBeInTheDocument();

    // Click loadmore to show next page
    fireEvent.click(loadBtn);
    expect(await screen.findByText("Prod 7")).toBeInTheDocument();
  });

  test("handles axios error (does not crash)", async () => {
    // Arrange
    useParams.mockReturnValue({ slug: "tshirts" });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error("network down"));

    // Act
    render(<CategoryProduct />);

    // Assert that it attempted fetch
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    // Assert toast error
    expect(toast.error).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  test("does NOT call axios.get when slug is missing", async () => {
    // Arrange
    useParams.mockReturnValue({}); 

    // Act
    render(<CategoryProduct />);

    // Assert
    expect(axios.get).not.toHaveBeenCalled();
  });
});