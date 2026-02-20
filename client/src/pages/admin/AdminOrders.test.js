import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminOrders from "./AdminOrders";
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

const renderAdminOrders = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
      <Routes>
        <Route path="/dashboard/admin/orders" element={<AdminOrders />} />
      </Routes>
    </MemoryRouter>,
  );

describe("AdminOrders Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("should render correctly", async () => {
    // Arrange
    axios.get.mockResolvedValue({ data: [] });

    // Act
    renderAdminOrders();

    // Assert
    await screen.findByText("All Orders");
  });

  it("should fetch and display orders", async () => {
    // Arrange
    const mockOrders = [
      {
        _id: "order1",
        status: "Not Process",
        buyer: { name: "John Doe" },
        createAt: "2024-06-01T12:00:00Z",
        payment: { success: true },
        products: [
          {
            _id: "prod1",
            name: "Product 1",
            description: "A sample product",
            price: 100,
          },
          {
            _id: "prod2",
            name: "Product 2",
            description: "Another sample product",
            price: 200,
          },
        ],
      },
    ];
    axios.get.mockResolvedValue({ data: mockOrders });

    // Act
    renderAdminOrders();

    // Assert
    await screen.findByText("John Doe");
    await screen.findByText("Not Processed");
    await screen.findByText("Success");
    await screen.findByText("Product 1");
    await screen.findByText("A sample product");
    await screen.findByText((text) => text.includes("100"));
    await screen.findByText("Product 2");
    await screen.findByText("Another sample product");
    await screen.findByText((text) => text.includes("200"));
  });

  it("should update order status on selection change", async () => {
    // Arrange
    const mockOrders = [
      {
        _id: "order1",
        status: "Not Process",
        buyer: { name: "John Doe" },
        createAt: "2024-06-01T12:00:00Z",
        payment: { success: true },
        products: [],
      },
    ];
    axios.get.mockResolvedValue({ data: mockOrders });
    axios.put.mockResolvedValue({ data: { success: true } });

    // Act
    renderAdminOrders();
    const select = await screen.findByTestId("test-select");
    fireEvent.change(select, { target: { value: "Processing" } });

    // Assert
    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/order1",
        { status: "Processing" },
      ),
    );
    expect(axios.put).toHaveBeenCalledTimes(1);
    await screen.findByText("Processing");
  });
});
