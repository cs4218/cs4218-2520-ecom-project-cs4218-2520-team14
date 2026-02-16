import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateProduct from "./CreateProduct";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import React from "react";

jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
  <main>{children}</main>
));

const renderCreateProduct = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
      <Routes>
        <Route
          path="/dashboard/admin/create-product"
          element={<CreateProduct />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("CreateProduct Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("should render correctly", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    renderCreateProduct();

    await screen.findByRole("heading", { name: "Create Product" });
    await screen.findByText("Select a category");
    await screen.findByLabelText("Upload Photo");
    await screen.findByPlaceholderText("write a name");
    await screen.findByPlaceholderText("write a description");
    await screen.findByPlaceholderText("write a price");
    await screen.findByPlaceholderText("write a quantity");
    await screen.findByText("Select Shipping");
    await screen.findByRole("button", { name: "CREATE PRODUCT" });
  });

  it("should be initially empty", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    renderCreateProduct();

    expect(
      await screen.findByPlaceholderText("write a name"),
    ).toHaveDisplayValue("");
    expect(
      await screen.findByPlaceholderText("write a description"),
    ).toHaveDisplayValue("");
    expect(
      await screen.findByPlaceholderText("write a price"),
    ).toHaveDisplayValue("");
    expect(
      await screen.findByPlaceholderText("write a quantity"),
    ).toHaveDisplayValue("");
  });

  it("should submit form correctly", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    const data = {
      name: "Test Product",
      description: "This is a test product",
      price: "9.99",
      quantity: "10",
    };
    axios.post.mockResolvedValue({ data: { success: true } });
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);

    renderCreateProduct();

    fireEvent.change(await screen.findByPlaceholderText("write a name"), {
      target: { value: data.name },
    });
    fireEvent.change(
      await screen.findByPlaceholderText("write a description"),
      { target: { value: data.description } },
    );
    fireEvent.change(await screen.findByPlaceholderText("write a price"), {
      target: { value: data.price },
    });
    fireEvent.change(await screen.findByPlaceholderText("write a quantity"), {
      target: { value: data.quantity },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "CREATE PRODUCT" }),
    );

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData),
      );
    });
    expect(axios.post.mock.calls[0][1].get("name")).toBe(data.name);
    expect(axios.post.mock.calls[0][1].get("description")).toBe(
      data.description,
    );
    expect(axios.post.mock.calls[0][1].get("price")).toBe(data.price);
    expect(axios.post.mock.calls[0][1].get("quantity")).toBe(data.quantity);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
  });

  it("should show error toast if form submission fails", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    axios.post.mockRejectedValue(new Error("Network Error"));

    renderCreateProduct();

    fireEvent.click(
      await screen.findByRole("button", { name: "CREATE PRODUCT" }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("something went wrong");
  });

  it("should show error toast if API returns unsuccessful response", async () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    axios.post.mockResolvedValue({
      data: { success: false, message: "Error creating product" },
    });

    renderCreateProduct();

    fireEvent.click(
      await screen.findByRole("button", { name: "CREATE PRODUCT" }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Error creating product");
  });
});
