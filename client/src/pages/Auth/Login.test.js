import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import Login from "./Login";

jest.mock("axios");
jest.mock("react-hot-toast");

// Mock Layout to avoid side effects
jest.mock("./../../components/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock useAuth (context)
const mockSetAuth = jest.fn();
jest.mock("../../context/auth", () => ({
  useAuth: () => [{ user: null, token: null }, mockSetAuth],
}));

// Router mocks
const mockNavigate = jest.fn();
let mockLocationState = null;

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

describe("Login.js (minimal coverage aligned with current implementation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = null;

    // Silence console.log from catch branch
    jest.spyOn(console, "log").mockImplementation(() => {});

    // localStorage spy
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    Storage.prototype.setItem.mockRestore();
  });

  const fillFields = (container, email = "john@test.com", password = "pass123") => {
    fireEvent.change(container.querySelector("#exampleInputEmail1"), {
      target: { value: email },
    });
    fireEvent.change(container.querySelector("#exampleInputPassword1"), {
      target: { value: password },
    });
  };

  it("renders inputs and buttons", () => {
    const { container, getByText } = render(<Login />);

    expect(container.querySelector("#exampleInputEmail1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputPassword1")).toBeInTheDocument();

    expect(getByText("Forgot Password")).toBeInTheDocument();
    expect(getByText("LOGIN")).toBeInTheDocument();
  });

  it("Forgot Password button navigates to /forgot-password", () => {
    const { getByText } = render(<Login />);
    fireEvent.click(getByText("Forgot Password"));
    expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
  });

  it("success (no location.state): shows success toast, sets auth, stores full res.data, navigates to /", async () => {
    const serverData = {
      success: true,
      message: "Welcome back",
      user: { name: "John" },
      token: "token123",
    };

    axios.post.mockResolvedValueOnce({ data: serverData });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
      email: "john@test.com",
      password: "pass123",
    });

    // Exactly how your Login.js calls it: (message, optionsObject)
    expect(toast.success).toHaveBeenCalledWith(
      "Welcome back",
      expect.any(Object)
    );

    expect(mockSetAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { name: "John" },
        token: "token123",
      })
    );

    // Your code stores JSON.stringify(res.data) (full payload)
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "auth",
      JSON.stringify(serverData)
    );

    // Your code: navigate(location.state || "/")
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("success (location.state is string): navigates to that state", async () => {
    mockLocationState = "/cart";

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok", user: {}, token: "t" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/cart");
  });

  it("failed login: shows server error message", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Invalid credentials" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    // Your code: toast.error(res.data.message)
    expect(toast.error).toHaveBeenCalledWith("Invalid credentials");

    // Should not navigate in this branch
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("network/exception: shows generic error toast", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network down"));

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    // Your code: toast.error("Something went wrong")
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });
});
