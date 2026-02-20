//Name: Shauryan Agrawal
//Student ID: A0265846N

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

describe("Login.js (minimal aligned with current Login.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = null;

    // silence console.error from catch branch
    jest.spyOn(console, "error").mockImplementation(() => {});

    // localStorage spy
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    Storage.prototype.setItem.mockRestore();
  });

  const fillFields = (
    container,
    email = "john@test.com",
    password = "pass123"
  ) => {
    fireEvent.change(container.querySelector("#exampleInputEmail1"), {
      target: { value: email },
    });
    fireEvent.change(container.querySelector("#exampleInputPassword1"), {
      target: { value: password },
    });
  };

  it("renders inputs + buttons", () => {
    const { container, getByText } = render(<Login />);
    expect(container.querySelector("#exampleInputEmail1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputPassword1")).toBeInTheDocument();
    expect(getByText("Forgot Password")).toBeInTheDocument();
    expect(getByText("LOGIN")).toBeInTheDocument();
  });

  it("Forgot Password navigates to /forgot-password", () => {
    const { getByText } = render(<Login />);
    fireEvent.click(getByText("Forgot Password"));
    expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
  });

  it("success: uses server message, stores {user, token}, navigates to / (no state)", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Welcome back",
        user: { name: "John" },
        token: "token123",
      },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

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

    // NEW behavior: store only { user, token }
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "auth",
      JSON.stringify({ user: { name: "John" }, token: "token123" })
    );

    // NEW behavior: getRedirectPath() -> "/" when no state
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it('success: no message => uses fallback "Login successful"', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        user: { name: "John" },
        token: "token123",
      },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.success).toHaveBeenCalledWith(
      "Login successful",
      expect.any(Object)
    );
  });

  it("redirect: location.state is string", async () => {
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

  it("redirect: location.state.from is string", async () => {
    mockLocationState = { from: "/profile" };

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok", user: {}, token: "t" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });

  it("redirect: location.state.from.pathname is string", async () => {
    mockLocationState = { from: { pathname: "/admin" } };

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok", user: {}, token: "t" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });

  it("redirect: weird state object => fallback to /", async () => {
    mockLocationState = { from: { notPathname: "/nope" } };

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok", user: {}, token: "t" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("failed login: shows fallback error when no message", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false }, // no message
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("Login failed");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("network/exception: shows generic error toast", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network down"));

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("double-submit guard: second submit does not call axios twice", () => {
    axios.post.mockImplementationOnce(() => new Promise(() => {})); // pending

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));
    fireEvent.submit(container.querySelector("form"));

    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
