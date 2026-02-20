import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import ProductDetails from "./ProductDetails";

jest.mock("axios");

// Mock Layout so tests focus on ProductDetails
jest.mock("./../components/Layout", () => {
  return function LayoutMock({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock router hooks
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

import { useParams, useNavigate } from "react-router-dom";

describe("ProductDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  test("renders page skeleton initially (no slug → no fetch)", () => {
    useParams.mockReturnValue({});
    render(<ProductDetails />);

    expect(screen.getByText("Product Details")).toBeInTheDocument();
    expect(screen.getByText("Similar Products ➡️")).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("calls get-product then related-product when slug exists", async () => {
    useParams.mockReturnValue({ slug: "basic-tee" });

    const fakeProduct = {
      _id: "p1",
      name: "Basic Tee",
      description: "Comfy tee",
      price: 12,
      category: { _id: "c1", name: "T-Shirts" },
    };

    axios.get
      .mockResolvedValueOnce({ data: { product: fakeProduct } })
      .mockResolvedValueOnce({ data: { products: [] } });

    render(<ProductDetails />);

    // wait for the component to *render* product (setProduct committed)
    expect(await screen.findByText(/Name\s*:\s*Basic Tee/i)).toBeInTheDocument();

    // wait for the component to *render* related state (setRelatedProducts committed)
    expect(
      await screen.findByText("No Similar Products found")
    ).toBeInTheDocument();

    // now it’s safe to assert axios calls
    expect(axios.get).toHaveBeenCalledWith(
      "/api/v1/product/get-product/basic-tee"
    );
    expect(axios.get).toHaveBeenCalledWith(
      "/api/v1/product/related-product/p1/c1"
    );
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test("renders product details after successful fetch", async () => {
    useParams.mockReturnValue({ slug: "basic-tee" });

    const fakeProduct = {
      _id: "p1",
      name: "Basic Tee",
      description: "A comfy tee for daily wear",
      price: 12,
      category: { _id: "c1", name: "T-Shirts" },
    };

    axios.get
      .mockResolvedValueOnce({ data: { product: fakeProduct } })
      .mockResolvedValueOnce({ data: { products: [] } });

    render(<ProductDetails />);

    expect(await screen.findByText(/Name\s*:\s*Basic Tee/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Description\s*:\s*A comfy tee/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Category\s*:\s*T-Shirts/i)).toBeInTheDocument();

    // price text can be split by whitespace; match flexibly
    expect(
      screen.getByText((content) => content.includes("$12.00"))
    ).toBeInTheDocument();

    const img = screen.getByAltText("Basic Tee");
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/p1");

    // wait for relatedProducts update to commit (prevents act warning)
    expect(
      await screen.findByText("No Similar Products found")
    ).toBeInTheDocument();

    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test("renders related product cards and navigates on 'More Details' click", async () => {
    useParams.mockReturnValue({ slug: "basic-tee" });

    const fakeProduct = {
      _id: "p1",
      name: "Basic Tee",
      description: "Comfy",
      price: 12,
      category: { _id: "c1", name: "T-Shirts" },
    };

    const related = [
      {
        _id: "p2",
        name: "Graphic Tee",
        slug: "graphic-tee",
        price: 25,
        description: "Limited edition graphic tee with cool print",
      },
    ];

    axios.get
      .mockResolvedValueOnce({ data: { product: fakeProduct } })
      .mockResolvedValueOnce({ data: { products: related } });

    render(<ProductDetails />);

    // wait for related product to appear (setRelatedProducts committed)
    expect(await screen.findByText("Graphic Tee")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("$25.00"))
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /more details/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/product/graphic-tee");

    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test("does not call related-product API if product/category ids are missing", async () => {
    useParams.mockReturnValue({ slug: "bad-product" });

    const fakeProduct = {
      _id: "p1",
      name: "Bad Product",
      category: {}, // missing _id
    };

    axios.get.mockResolvedValueOnce({ data: { product: fakeProduct } });

    render(<ProductDetails />);

    // wait for setProduct commit
    expect(await screen.findByText(/Name\s*:\s*Bad Product/i)).toBeInTheDocument();

    // should not call related API
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      "/api/v1/product/get-product/bad-product"
    );
  });

  test("uses empty object when API returns no product (covers p || {})", async () => {
    useParams.mockReturnValue({ slug: "no-product" });

    axios.get.mockResolvedValueOnce({ data: { product: null } }); // p = null

    render(<ProductDetails />);

    // It should still render the skeleton and not crash
    expect(await screen.findByText("Product Details")).toBeInTheDocument();

    // Only first call happens; related call not triggered
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  test("logs error when getProduct API fails (covers catch in getProduct)", async () => {
    useParams.mockReturnValue({ slug: "fail-product" });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error("boom"));

    render(<ProductDetails />);

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  test("handles error in related-product API gracefully", async () => {
    useParams.mockReturnValue({ slug: "basic-tee" });

    const fakeProduct = {
        _id: "p1",
        name: "Basic Tee",
        description: "Comfy",
        price: 12,
        category: { _id: "c1", name: "T-Shirts" },
    };

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    axios.get
        .mockResolvedValueOnce({ data: { product: fakeProduct } }) // first call succeeds
        .mockRejectedValueOnce(new Error("related fetch failed")); // second call fails

    render(<ProductDetails />);

    // wait for first state update
    expect(await screen.findByText(/Name\s*:\s*Basic Tee/i)).toBeInTheDocument();

    // ensure error branch was hit
    await waitFor(() => expect(logSpy).toHaveBeenCalled());

    logSpy.mockRestore();
  });


});