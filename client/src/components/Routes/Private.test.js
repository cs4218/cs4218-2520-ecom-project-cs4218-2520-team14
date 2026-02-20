import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Private from "./Private";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "../../context/auth";
import React from "react";
import axios from "axios";

jest.mock("axios");
jest.mock("../../context/auth");
jest.mock("../Spinner", () => () => <div>Loading...</div>);
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Outlet: () => <div>Private Content</div>,
}));

const renderPrivate = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Private />} />
      </Routes>
    </MemoryRouter>,
  );

describe("PrivateRoute Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("should render Spinner initially", async () => {
    // Arrange
    useAuth.mockReturnValue([]);

    // Act
    renderPrivate();

    // Assert
    await screen.findByText("Loading...");
  });

  it("should render Spinner without auth token", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: null }]);

    // Act
    renderPrivate();

    // Assert
    await screen.findByText("Loading...");
  });

  it("should render Spinner if auth check fails", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "valid-token" }]);
    axios.get.mockResolvedValue({ data: { ok: false } });

    // Act
    renderPrivate();

    // Assert
    await screen.findByText("Loading...");
  });

  it("should render Outlet if auth check succeeds", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "valid-token" }]);
    axios.get.mockResolvedValue({ data: { ok: true } });

    // Act
    renderPrivate();

    // Assert
    await screen.findByText("Private Content");
  });
});
