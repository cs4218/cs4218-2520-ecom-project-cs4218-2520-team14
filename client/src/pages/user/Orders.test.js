import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import moment from "moment";
import Orders from "./Orders";

jest.mock("axios");
jest.mock("../../components/UserMenu", () => () => (
  <div data-testid="usermenu" />
));
jest.mock("./../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

const mockUseAuth = jest.fn();
jest.mock("../../context/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Orders", () => {
  const renderOrders = () =>
    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page shell and heading", () => {
    mockUseAuth.mockReturnValue([{ token: "token-123" }]);
    axios.get.mockResolvedValueOnce({ data: [] });

    renderOrders();

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("usermenu")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /all orders/i })).toBeInTheDocument();
  });

  it("does not fetch orders when auth.token is missing", async () => {
    mockUseAuth.mockReturnValue([{}]);

    renderOrders();

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  it("fetches and displays orders with products", async () => {
    const buyer = { name: "Mina Sue" };

    const orders = [
      {
        _id: "order1",
        status: "Processing",
        buyer,
        createdAt: "2026-02-17T10:00:00.000Z",
        payment: { success: true },
        products: [
          {
            _id: "p1",
            name: "Yellow Dress",
            description: "A yellow dress that captures the attention of many.",
            price: 25,
          },
          {
            _id: "p2",
            name: "Blue Jeans",
            description: "New jeans that last forever.",
            price: 60,
          },
        ],
      },
      {
        _id: "order2",
        status: "Delivered",
        buyer,
        createdAt: "2026-02-16T10:00:00.000Z",
        payment: { success: false },
        products: [
          {
            _id: "p3",
            name: "Spring Toy",
            description: "Perfect for active cats.",
            price: 80,
          },
        ],
      },
    ];

    mockUseAuth.mockReturnValue([{ token: "token-123" }]);
    axios.get.mockResolvedValueOnce({ data: orders });

    renderOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });

    expect(await screen.findByText("Processing")).toBeInTheDocument();

    expect(screen.getAllByText("Mina Sue").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();

    expect(screen.getByText("Delivered")).toBeInTheDocument();

    expect(screen.getByText("Yellow Dress")).toBeInTheDocument();
    expect(screen.getByText("Blue Jeans")).toBeInTheDocument();
    expect(screen.getByText("Spring Toy")).toBeInTheDocument();

    expect(screen.getByText("$25")).toBeInTheDocument();
    expect(screen.getByText("$60")).toBeInTheDocument();
    expect(screen.getByText("$80")).toBeInTheDocument();

    expect(screen.getByAltText("Yellow Dress")).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p1"
    );

    expect(screen.getByText(moment(orders[0].createdAt).fromNow())).toBeInTheDocument();
    expect(screen.getByText(moment(orders[1].createdAt).fromNow())).toBeInTheDocument();
  });

  it("handles axios error without crashing", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockUseAuth.mockReturnValue([{ token: "token-123" }]);
    axios.get.mockRejectedValueOnce(new Error("Network error"));

    renderOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });

    expect(logSpy).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /all orders/i })).toBeInTheDocument();

    logSpy.mockRestore();
  });

  it("renders with empty orders list", async () => {
    mockUseAuth.mockReturnValue([{ token: "token-123" }]);
    axios.get.mockResolvedValueOnce({ data: [] });

    renderOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
    });

    expect(screen.getByText("All Orders")).toBeInTheDocument();
    expect(screen.queryByText("Processing")).not.toBeInTheDocument();
  });

  it("uses index fallback keys when _id is missing for orders/products", async () => {
    mockUseAuth.mockReturnValue([{ token: "token-123" }]);

    axios.get.mockResolvedValueOnce({
      data: [
        {
          // order _id intentionally missing
          status: "Processing",
          buyer: { name: "Mina Sue" },
          createdAt: "2026-02-17T10:00:00.000Z",
          payment: { success: true },
          products: [
            {
              // product _id intentionally missing
              name: "Red Shirt",
              description: "Huat ah!",
              price: 25,
            },
          ],
        },
      ],
    });

    renderOrders();

    expect(await screen.findByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Red Shirt")).toBeInTheDocument();
  });
});