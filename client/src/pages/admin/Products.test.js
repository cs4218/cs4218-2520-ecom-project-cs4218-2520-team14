// Jonas Ong, A0252052U

import axios from "axios";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Products from "./Products";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import toast from "react-hot-toast";

jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
  <main>{children}</main>
));

const renderProducts = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
      <Routes>
        <Route path="/dashboard/admin/products" element={<Products />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Products Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("should render correctly", async () => {
    axios.get.mockResolvedValue({ data: { products: [] } });
    renderProducts();

    await screen.findByText("All Products List");
  });

  it("should display products correctly", async () => {
    const mockProducts = [
      {
        _id: "1",
        name: "Product 1",
        description: "Description 1",
        slug: "product-1",
      },
      {
        _id: "2",
        name: "Product 2",
        description: "Description 2",
        slug: "product-2",
      },
    ];
    axios.get.mockResolvedValue({ data: { products: mockProducts } });
    renderProducts();

    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    await screen.findByText("Product 1");
    await screen.findByText("Description 1");
    await screen.findByText("Product 2");
    await screen.findByText("Description 2");
  });

  it("should show error toast if API call fails", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));
    renderProducts();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something Went Wrong");
    });
  });
});
