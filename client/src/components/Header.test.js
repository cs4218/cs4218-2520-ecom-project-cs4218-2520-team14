// Author: Tan Qin Yong A0253468W

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header"; // adjust path if needed

import toast from "react-hot-toast";

// ---- mocks ----
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
  },
}));

// Mock SearchInput 
jest.mock("./Form/SearchInput", () => {
  return function SearchInputMock() {
    return <div data-testid="search-input" />;
  };
});

// Mock useCategory hook
jest.mock("../hooks/useCategory", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock auth + cart context hooks
jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

// Mock antd Badge 
jest.mock("antd", () => ({
  Badge: ({ count, children }) => (
    <div data-testid="badge" data-count={count}>
      {children}
    </div>
  ),
}));

import useCategory from "../hooks/useCategory";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // default mocks
    useCategory.mockReturnValue([
      { _id: "c1", name: "T-Shirts", slug: "tshirts" },
      { _id: "c2", name: "Shoes", slug: "shoes" },
    ]);

    useCart.mockReturnValue([[{ _id: "p1" }, { _id: "p2" }]]); // cart length = 2

    // localStorage mock
    Object.defineProperty(window, "localStorage", {
      value: {
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  test("renders brand, search input, and guest links when not logged in", () => {
    // Arrange: guest
    useAuth.mockReturnValue([
      { user: null, token: "" },
      jest.fn(),
    ]);

    // Act
    renderWithRouter(<Header />);

    // Assert
    expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();

    // logged-in menu should not appear
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();

    // cart badge count
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("data-count", "2");
  });

  test("renders user dropdown when logged in", () => {
    // Arrange: logged in user
    useAuth.mockReturnValue([
      { user: { name: "Kailin", role: 0 }, token: "t" },
      jest.fn(),
    ]);

    // Act
    renderWithRouter(<Header />);

    // Assert: user name shown
    expect(screen.getByText("Kailin")).toBeInTheDocument();

    // Register/Login should be gone
    expect(screen.queryByRole("link", { name: /register/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /login/i })).not.toBeInTheDocument();

    // Dashboard + Logout options exist (they're in DOM even if dropdown isn't "opened" by bootstrap in tests)
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard/user"
    );
    expect(screen.getByRole("link", { name: /logout/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  test("uses admin dashboard link when role === 1", () => {
    useAuth.mockReturnValue([
      { user: { name: "Admin", role: 1 }, token: "t" },
      jest.fn(),
    ]);

    renderWithRouter(<Header />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard/admin"
    );
  });

  test("logout clears auth, removes localStorage, and shows toast", () => {
    // Arrange
    const setAuth = jest.fn();
    const authState = { user: { name: "Kailin", role: 0 }, token: "t" };

    useAuth.mockReturnValue([authState, setAuth]);

    renderWithRouter(<Header />);

    // Act: click Logout
    fireEvent.click(screen.getByRole("link", { name: /logout/i }));

    // Assert: setAuth called with user null + token empty (preserves other auth fields if any)
    expect(setAuth).toHaveBeenCalledWith({
      ...authState,
      user: null,
      token: "",
    });

    expect(window.localStorage.removeItem).toHaveBeenCalledWith("auth");
    expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
  });

  test("renders category links from useCategory", () => {
    useAuth.mockReturnValue([{ user: null, token: "" }, jest.fn()]);

    renderWithRouter(<Header />);

    // "All Categories" link
    expect(screen.getByRole("link", { name: /all categories/i })).toHaveAttribute(
      "href",
      "/categories"
    );

    // category items rendered
    expect(screen.getByRole("link", { name: "T-Shirts" })).toHaveAttribute(
      "href",
      "/category/tshirts"
    );
    expect(screen.getByRole("link", { name: "Shoes" })).toHaveAttribute(
      "href",
      "/category/shoes"
    );
  });
});