//Name: Shauryan Agrawal
//Student ID: A0265846N

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import ForgotPassword from "./ForgotPassword";

jest.mock("axios");
jest.mock("react-hot-toast");

// Mock Layout to avoid side effects
jest.mock("./../../components/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Router mock
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ForgotPassword.js (detailed coverage aligned with current ForgotPassword.js)", () => {
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const getEmailInput = (container) =>
    container.querySelector("#exampleInputEmail1");

  const getAnswerInput = (container) =>
    container.querySelector("#exampleInputAnswer1");

  const getNewPasswordInput = (container) =>
    container.querySelector("#exampleInputNewPassword1");

  const getForm = (container) => container.querySelector("form");

  const getSubmitButton = (container) =>
    container.querySelector('button[type="submit"]');

  const fillFields = (
    container,
    email = "john@test.com",
    answer = "football",
    newPassword = "newpass123"
  ) => {
    fireEvent.change(getEmailInput(container), {
      target: { value: email },
    });
    fireEvent.change(getAnswerInput(container), {
      target: { value: answer },
    });
    fireEvent.change(getNewPasswordInput(container), {
      target: { value: newPassword },
    });
  };

  it("renders base UI: all inputs, heading, and RESET PASSWORD button", () => {
    const { container, getByRole } = render(<ForgotPassword />);

    expect(container.querySelector('[data-testid="layout"]')).toBeInTheDocument();

    expect(
      getByRole("heading", { name: "RESET PASSWORD" })
    ).toBeInTheDocument();

    expect(
      getByRole("button", { name: "RESET PASSWORD" })
    ).toBeInTheDocument();

    expect(getEmailInput(container)).toBeInTheDocument();
    expect(getAnswerInput(container)).toBeInTheDocument();
    expect(getNewPasswordInput(container)).toBeInTheDocument();

    expect(getEmailInput(container)).toHaveAttribute("placeholder", "Enter Your Email");
    expect(getAnswerInput(container)).toHaveAttribute(
      "placeholder",
      "What is Your Favorite sports"
    );
    expect(getNewPasswordInput(container)).toHaveAttribute(
      "placeholder",
      "Enter Your New Password"
    );
  });

  it("submits correct payload to /api/v1/auth/forgot-password", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Reset failed" },
    });

    const { container } = render(<ForgotPassword />);
    fillFields(container, "x@test.com", "cricket", "pw123");

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
      email: "x@test.com",
      answer: "cricket",
      newPassword: "pw123",
    });
  });

  it("success: uses server message, shows success toast, navigates to /login, and re-enables UI", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Password reset complete",
      },
    });

    const { container, getByText, getByRole } = render(<ForgotPassword />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() =>
      expect(getByText("RESETTING...")).toBeInTheDocument()
    );

    expect(getEmailInput(container)).toBeDisabled();
    expect(getAnswerInput(container)).toBeDisabled();
    expect(getNewPasswordInput(container)).toBeDisabled();
    expect(getSubmitButton(container)).toBeDisabled();

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.success).toHaveBeenCalledWith(
      "Password reset complete",
      expect.any(Object)
    );

    expect(mockNavigate).toHaveBeenCalledWith("/login");

    await waitFor(() => {
      expect(
        getByRole("button", { name: "RESET PASSWORD" })
      ).toBeInTheDocument();
      expect(getEmailInput(container)).not.toBeDisabled();
      expect(getAnswerInput(container)).not.toBeDisabled();
      expect(getNewPasswordInput(container)).not.toBeDisabled();
      expect(getSubmitButton(container)).not.toBeDisabled();
    });
  });

  it('success: no message => uses fallback "Password Reset Successfully"', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
      },
    });

    const { container } = render(<ForgotPassword />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.success).toHaveBeenCalledWith(
      "Password Reset Successfully",
      expect.any(Object)
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("failed reset: uses server message when provided, does not navigate", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Answer incorrect",
      },
    });

    const { container } = render(<ForgotPassword />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.error).toHaveBeenCalledWith("Answer incorrect");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('failed reset: fallback error message "Password reset failed" when server gives no message', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
      },
    });

    const { container } = render(<ForgotPassword />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.error).toHaveBeenCalledWith("Password reset failed");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("network/exception: logs error, shows generic toast, and re-enables UI", async () => {
    const err = new Error("Network down");
    axios.post.mockRejectedValueOnce(err);

    const { container, getByRole } = render(<ForgotPassword />);
    fillFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(console.error).toHaveBeenCalledWith(err);
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    expect(mockNavigate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(
        getByRole("button", { name: "RESET PASSWORD" })
      ).toBeInTheDocument();
      expect(getEmailInput(container)).not.toBeDisabled();
      expect(getAnswerInput(container)).not.toBeDisabled();
      expect(getNewPasswordInput(container)).not.toBeDisabled();
      expect(getSubmitButton(container)).not.toBeDisabled();
    });
  });

  it("double-submit guard: second submit while pending does not call axios twice", () => {
    axios.post.mockImplementationOnce(() => new Promise(() => {})); // pending forever

    const { container } = render(<ForgotPassword />);
    fillFields(container);

    fireEvent.submit(getForm(container));
    fireEvent.submit(getForm(container));

    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});