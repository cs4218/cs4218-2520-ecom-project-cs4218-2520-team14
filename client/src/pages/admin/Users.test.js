// Teng Hui Xin Alicia, A0259064Y
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Users from "./Users";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="adminmenu" />
));

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

describe("Admin Users", () => {
  const renderUsers = () =>
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page with correct heading and table headers", async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    renderUsers();

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("adminmenu")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /all users/i }),
    ).toBeInTheDocument();

    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/users");
    });
  });

  it("renders 'No users found.' when API returns empty list", async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    renderUsers();

    expect(await screen.findByText("No users found.")).toBeInTheDocument();
  });

  it("renders users when API returns array directly", async () => {
    const users = [
      {
        _id: "user1",
        name: "Mina Sue",
        email: "mina.sue@netflix.com",
        phone: "123456789",
        address: "Singles Inferno",
        role: 0,
        createdAt: "2026-02-18T10:00:00.000Z",
      },
      {
        _id: "user2",
        name: "Min Gee",
        email: "min.gee@netflix.com",
        phone: "",
        address: null,
        role: 1,
        createdAt: null,
      },
    ];

    axios.get.mockResolvedValueOnce({ data: users });

    renderUsers();

    expect(await screen.findByText("Mina Sue")).toBeInTheDocument();

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(screen.getByText("mina.sue@netflix.com")).toBeInTheDocument();
    expect(screen.getByText("123456789")).toBeInTheDocument();
    expect(screen.getByText("Singles Inferno")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();

    expect(screen.getByText("Min Gee")).toBeInTheDocument();
    expect(screen.getByText("min.gee@netflix.com")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();

    // phone/address fallback when null is "-"
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);

    const createdStr = new Date(users[0].createdAt).toLocaleString();
    expect(screen.getByText(createdStr)).toBeInTheDocument();
  });

  it("renders users when API returns { users: [...] } shape", async () => {
    const users = [
      {
        _id: "user11",
        name: "John Doe",
        email: "john@doe.com",
        phone: "999",
        address: "123 Avenue",
        role: 0,
        createdAt: "2026-02-10T01:02:03.000Z",
      },
    ];

    axios.get.mockResolvedValueOnce({ data: { users } });

    renderUsers();

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@doe.com")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("shows error toast when API call fails (uses server message if present)", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce({
      response: { status: 500, data: { message: "Server down" } },
      message: "Request failed",
    });

    renderUsers();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/users");
    });

    expect(toast.error).toHaveBeenCalledWith("Server down");

    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it("shows default error toast message when API call fails without server message", async () => {
    axios.get.mockRejectedValueOnce({
      response: { status: 500, data: {} },
      message: "Request failed",
    });

    renderUsers();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch users");
    });
  });
});
