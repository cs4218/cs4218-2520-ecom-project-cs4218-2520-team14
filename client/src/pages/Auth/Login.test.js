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

//must be prefixed with "mock" (jest hoist rule)
let mockLocationState = null;

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

describe("Login.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = null;

    // silence console.error for the rejected axios test
    jest.spyOn(console, "error").mockImplementation(() => {});

    // localStorage spy
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
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

  it("renders email + password + buttons", () => {
    const { container, getByText } = render(<Login />);

    expect(container.querySelector("#exampleInputEmail1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputPassword1")).toBeInTheDocument();
    expect(getByText("Forgot Password")).toBeInTheDocument();
    expect(getByText("LOGIN")).toBeInTheDocument();
  });

  it("forgot password button navigates to /forgot-password", () => {
    const { getByText } = render(<Login />);
    fireEvent.click(getByText("Forgot Password"));
    expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
  });

  it("submitting sends POST with correct payload", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true, user: {}, token: "t" } });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
      email: "john@test.com",
      password: "pass123",
    });
  });

  it("success: uses server message, sets auth, stores localStorage, navigates to /", async () => {
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

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    expect(toast.success).toHaveBeenCalledWith(
      "Welcome back",
      expect.objectContaining({ duration: 5000 })
    );

    expect(mockSetAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { name: "John" },
        token: "token123",
      })
    );

    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "auth",
      JSON.stringify({ user: { name: "John" }, token: "token123" })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it('success without message: uses fallback "Login successful"', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: true, user: { name: "John" }, token: "token123" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    expect(toast.success).toHaveBeenCalledWith("Login successful", expect.any(Object));
  });

  it("redirect branch: location.state is string", async () => {
    mockLocationState = "/cart";

    axios.post.mockResolvedValueOnce({
      data: { success: true, user: {}, token: "t", message: "ok" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith("/cart");
  });

  it("redirect branch: location.state.from is string", async () => {
    mockLocationState = { from: "/profile" };

    axios.post.mockResolvedValueOnce({
      data: { success: true, user: {}, token: "t", message: "ok" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });

  it("redirect branch: location.state.from.pathname is string", async () => {
    mockLocationState = { from: { pathname: "/admin" } };

    axios.post.mockResolvedValueOnce({
      data: { success: true, user: {}, token: "t", message: "ok" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });

  it("redirect branch: weird state object -> fallback to /", async () => {
    // covers final return "/" branch in getRedirectPath
    mockLocationState = { from: { notPathname: "/nope" } };

    axios.post.mockResolvedValueOnce({
      data: { success: true, user: {}, token: "t", message: "ok" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("failed login: shows error message from server", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Invalid credentials" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('failed login without message: shows fallback "Login failed"', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Login failed");
  });

  it('unexpected error: shows generic "Something went wrong"', async () => {
    axios.post.mockRejectedValueOnce(new Error("Network down"));

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("double-submit guard: second submit does not call axios twice", () => {
    // Keep axios pending so isSubmitting becomes true and stays true
    axios.post.mockImplementationOnce(() => new Promise(() => {}));

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(container.querySelector("form"));
    fireEvent.submit(container.querySelector("form"));

    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
