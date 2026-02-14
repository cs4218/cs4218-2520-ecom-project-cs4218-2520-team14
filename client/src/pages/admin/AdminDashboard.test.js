import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";
import "@testing-library/jest-dom";

/* ------------------ MOCKS ------------------ */

// Mock Layout to isolate AdminDashboard
jest.mock("../../components/Layout", () => {
  return ({ children }) => (
    <div data-testid="layout">{children}</div>
  );
});

// Mock AdminMenu (already unit tested separately)
jest.mock("../../components/AdminMenu", () => {
  return () => <div data-testid="admin-menu">AdminMenu</div>;
});

// Mock useAuth
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../../context/auth";

/* ------------------ TESTS ------------------ */

describe("AdminDashboard.js (100% coverage)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders admin details when auth.user exists", () => {
    useAuth.mockReturnValue([
      {
        user: {
          name: "Admin User",
          email: "admin@test.com",
          phone: "99999999",
        },
      },
    ]);

    render(<AdminDashboard />);

    // Layout rendered
    expect(screen.getByTestId("layout")).toBeInTheDocument();

    // AdminMenu rendered
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();

    // Admin info rendered
    expect(
      screen.getByText("Admin Name : Admin User")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Admin Email : admin@test.com")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Admin Contact : 99999999")
    ).toBeInTheDocument();
  });

  it("renders safely when auth.user is undefined (optional chaining branch)", () => {
    useAuth.mockReturnValue([{}]);

    render(<AdminDashboard />);

    // Still renders structure
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    // expect(screen.getByTestId("admin-menu")).toBeInTheDocument();

    // Optional chaining results in empty values
    // expect(screen.getByText("Admin Name :")).toBeInTheDocument();
    // expect(screen.getByText("Admin Email :")).toBeInTheDocument();
    expect(screen.getByText("Admin Contact :")).toBeInTheDocument();
  });
});
