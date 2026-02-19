import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
jest.mock("antd", () => {
  const Select = ({ children, onChange, placeholder }) => (
    <select
      data-testid="test-select"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );

  Select.Option = ({ children, value }) => (
    <option value={value} data-testid="test-selection">
      {children}
    </option>
  );

  return { ...jest.requireActual("antd"), Select };
});

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
    await screen.findByPlaceholderText("Select a category");
    await screen.findByLabelText("Upload Photo");
    await screen.findByPlaceholderText("write a name");
    await screen.findByPlaceholderText("write a description");
    await screen.findByPlaceholderText("write a price");
    await screen.findByPlaceholderText("write a quantity");
    await screen.findByPlaceholderText("Select Shipping");
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

  it("should render categories correctly if categories exist", async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        category: [
          { _id: 0, name: "TestCategory" },
          { _id: 1, name: "TestCategory2" },
        ],
      },
    });

    renderCreateProduct();

    await screen.findByText("TestCategory");
    await screen.findByText("TestCategory2");
  });

  it("should show error toast if fetching categories fails", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));

    renderCreateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(toast.error).toHaveBeenCalledWith(
      "Something went wrong in getting category",
    );
  });

  it("should submit form correctly", async () => {
    const category = { _id: "0", name: "Test Category" };
    const file = new File(["test"], "test.png", { type: "image/png" });
    axios.get.mockResolvedValue({
      data: { success: true, category: [category] },
    });
    const data = {
      category: category._id,
      photo: file,
      name: "Test Product",
      description: "This is a test product",
      price: "9.99",
      quantity: "10",
      shipping: "1",
    };
    axios.post.mockResolvedValue({ data: { success: true } });
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    global.URL.createObjectURL = jest.fn(() => "blob:http://localhost/test");

    renderCreateProduct();

    await screen.findByText(category.name);
    fireEvent.change((await screen.findAllByTestId("test-select"))[0], {
      target: { value: data.category },
    });
    fireEvent.change(await screen.findByLabelText("Upload Photo"), {
      target: { files: [data.photo] },
    });
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
    fireEvent.change((await screen.findAllByTestId("test-select"))[1], {
      target: { value: data.shipping },
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
    expect(axios.post.mock.calls[0][1].get("category")).toBe(category._id);
    expect(axios.post.mock.calls[0][1].get("photo")).toBe(file);
    expect(axios.post.mock.calls[0][1].get("name")).toBe(data.name);
    expect(axios.post.mock.calls[0][1].get("description")).toBe(
      data.description,
    );
    expect(axios.post.mock.calls[0][1].get("price")).toBe(data.price);
    expect(axios.post.mock.calls[0][1].get("quantity")).toBe(data.quantity);
    expect(axios.post.mock.calls[0][1].get("shipping")).toBe(data.shipping);
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
