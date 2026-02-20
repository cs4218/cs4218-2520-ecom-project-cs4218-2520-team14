//Name: Shauryan Agrawal
//Student ID: A0265846N

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminDashboard from "./AdminDashboard";

// Mock Layout
jest.mock("../../components/Layout", () => {
  return ({ children }) => <div data-testid="layout">{children}</div>;
});

// Mock AdminMenu
jest.mock("../../components/AdminMenu", () => {
  return () => <div data-testid="admin-menu">AdminMenu</div>;
});

// Mock useAuth
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../../context/auth";

describe("AdminDashboard.js (minimal)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders admin info when user exists", () => {
    useAuth.mockReturnValue([
      { user: { name: "Admin User", email: "admin@test.com", phone: "99999999" } },
    ]);

    render(<AdminDashboard />);

    // basic structure
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();

    // values wired correctly
    expect(screen.getByText(/Admin User/)).toBeInTheDocument();
    expect(screen.getByText(/admin@test.com/)).toBeInTheDocument();
    expect(screen.getByText(/99999999/)).toBeInTheDocument();
  });

  it("does not crash when user is missing", () => {
    useAuth.mockReturnValue([{}]); // user undefined

    render(<AdminDashboard />);

    // if optional chaining removed, render would crash and test fails
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
  });
});
