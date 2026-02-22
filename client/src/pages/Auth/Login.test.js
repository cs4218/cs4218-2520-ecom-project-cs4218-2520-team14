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
const mockAuthState = { user: null, token: null };

jest.mock("../../context/auth", () => ({
  useAuth: () => [mockAuthState, mockSetAuth],
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

describe("Login.js (detailed 100% coverage aligned with current Login.js)", () => {
  let errorSpy;
  let setItemSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationState = null;

    // silence console.error from catch branch
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // localStorage spy
    setItemSpy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  const getEmailInput = (container) =>
    container.querySelector("#exampleInputEmail1");
  const getPasswordInput = (container) =>
    container.querySelector("#exampleInputPassword1");
  const getForm = (container) => container.querySelector("form");
  const getSubmitButton = (container) =>
    container.querySelector('button[type="submit"]');

  const fillFields = (
    container,
    email = "john@test.com",
    password = "pass123"
  ) => {
    fireEvent.change(getEmailInput(container), {
      target: { value: email },
    });
    fireEvent.change(getPasswordInput(container), {
      target: { value: password },
    });
  };

  it("renders base UI: inputs, Forgot Password button, and LOGIN submit label", () => {
    const { container, getByText } = render(<Login />);

    expect(getEmailInput(container)).toBeInTheDocument();
    expect(getPasswordInput(container)).toBeInTheDocument();

    expect(getByText("Forgot Password")).toBeInTheDocument();
    expect(getByText("LOGIN")).toBeInTheDocument();

    // layout wrapper present (mocked)
    expect(container.querySelector('[data-testid="layout"]')).toBeInTheDocument();
  });

  it("Forgot Password button navigates to /forgot-password", () => {
    const { getByText } = render(<Login />);

    fireEvent.click(getByText("Forgot Password"));
    expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
  });

  it("submits correct payload to /api/v1/auth/login", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Invalid" },
    });

    const { container } = render(<Login />);
    fillFields(container, "x@test.com", "pw");

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
      email: "x@test.com",
      password: "pw",
    });
  });

  it("success: uses server message, sets auth, stores {user, token}, redirects to / when no location.state", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Welcome back",
        user: { name: "John" },
        token: "token123",
      },
    });

    const { container, getByText } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    // while submitting -> button label changes + disabled states
    await waitFor(() => expect(getByText("LOGGING IN...")).toBeInTheDocument());
    expect(getEmailInput(container)).toBeDisabled();
    expect(getPasswordInput(container)).toBeDisabled();
    expect(getSubmitButton(container)).toBeDisabled();

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

    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "auth",
      JSON.stringify({ user: { name: "John" }, token: "token123" })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/");

    // finally runs -> inputs re-enabled + label back to LOGIN
    await waitFor(() =>
      expect(getByText("LOGIN")).toBeInTheDocument()
    );
    expect(getEmailInput(container)).not.toBeDisabled();
    expect(getPasswordInput(container)).not.toBeDisabled();
    expect(getSubmitButton(container)).not.toBeDisabled();
  });

  it('success: no message => uses fallback "Login successful"', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        // message missing intentionally
        user: { name: "John" },
        token: "token123",
      },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.success).toHaveBeenCalledWith(
      "Login successful",
      expect.any(Object)
    );
  });

  it("redirect logic: location.state is string", async () => {
    mockLocationState = "/cart";

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok", user: {}, token: "t" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/cart");
  });

  it("redirect logic: location.state.from is string", async () => {
    mockLocationState = { from: "/profile" };

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok", user: {}, token: "t" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });

  it("redirect logic: location.state.from.pathname is string", async () => {
    mockLocationState = { from: { pathname: "/admin" } };

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok", user: {}, token: "t" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });

  it("redirect logic: weird state object => fallback to /", async () => {
    mockLocationState = { from: { notPathname: "/nope" } };

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "ok", user: {}, token: "t" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("failed login: uses server message when provided, does not set auth/store/navigate", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Invalid credentials" },
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(Storage.prototype.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('failed login: fallback error message "Login failed" when server gives no message', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false }, // no message
    });

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.error).toHaveBeenCalledWith("Login failed");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("network/exception: logs error and shows generic toast, and re-enables UI in finally", async () => {
    const err = new Error("Network down");
    axios.post.mockRejectedValueOnce(err);

    const { container, getByText } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(console.error).toHaveBeenCalledWith(err);
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");

    // finally -> back to normal
    await waitFor(() => expect(getByText("LOGIN")).toBeInTheDocument());
    expect(getEmailInput(container)).not.toBeDisabled();
    expect(getPasswordInput(container)).not.toBeDisabled();
    expect(getSubmitButton(container)).not.toBeDisabled();
  });

  it("double-submit guard: second submit while pending does not call axios twice", () => {
    axios.post.mockImplementationOnce(() => new Promise(() => {})); // pending forever

    const { container } = render(<Login />);
    fillFields(container);

    fireEvent.submit(getForm(container));
    fireEvent.submit(getForm(container));

    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});