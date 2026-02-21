import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import CategoryProduct from "./CategoryProduct"; 

// Mock axios
jest.mock("axios");

// Mock Layout to avoid dependencies on Layout internals
jest.mock("../components/Layout", () => {
  return function LayoutMock({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

import { useParams, useNavigate } from "react-router-dom";

describe("CategoryProduct", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
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

  test("handles axios error (does not crash)", async () => {
    // Arrange
    useParams.mockReturnValue({ slug: "tshirts" });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error("network down"));

    // Act
    render(<CategoryProduct />);

    // Assert that it attempted fetch
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    // Confirms error path hit
    expect(logSpy).toHaveBeenCalled();

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