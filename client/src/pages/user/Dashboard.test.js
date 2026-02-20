import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import { useAuth } from "../../context/auth";
import React from "react";

jest.mock("../../context/auth");
jest.mock("./../../components/Layout", () => ({ children }) => (
  <main>{children}</main>
));

jest.mock("./../../components/UserMenu", () => () => <nav>UserMenu</nav>);

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/user"]}>
      <Routes>
        <Route path="/dashboard/user" element={<Dashboard />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Dashboard Component", () => {
  it("should render correctly", async () => {
    // Arrange
    useAuth.mockReturnValue([]);

    // Act
    renderDashboard();

    // Assert
    await screen.findByText("UserMenu");
  });

  it("should render user information correctly", async () => {
    // Arrange
    useAuth.mockReturnValue([
      {
        user: {
          name: "John Doe",
          email: "johndoe@gmail.com",
          address: "123 Main St",
        },
      },
    ]);

    // Act
    renderDashboard();

    // Assert
    await screen.findByText("John Doe");
    await screen.findByText("johndoe@gmail.com");
    await screen.findByText("123 Main St");
  });
});
