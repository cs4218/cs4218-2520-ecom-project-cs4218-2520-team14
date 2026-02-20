//Name: Shauryan Agrawal
//Student ID: A0265846N

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import Register from "./Register";

// axios + toast mocks
jest.mock("axios");
jest.mock("react-hot-toast");

// Mock Layout to prevent Header/useCategory side effects
jest.mock("./../../components/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock navigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("Register.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fillAllFields = (container) => {
    fireEvent.change(container.querySelector("#exampleInputName1"), {
      target: { value: "John Doe" },
    });

    fireEvent.change(container.querySelector("#exampleInputEmail1"), {
      target: { value: "john@test.com" },
    });

    fireEvent.change(container.querySelector("#exampleInputPassword1"), {
      target: { value: "pass123" },
    });

    fireEvent.change(container.querySelector("#exampleInputPhone1"), {
      target: { value: "1234567890" },
    });

    fireEvent.change(container.querySelector("#exampleInputaddress1"), {
      target: { value: "SG" },
    });

    fireEvent.change(container.querySelector("#exampleInputDOB1"), {
      target: { value: "2000-01-01" },
    });

    fireEvent.change(container.querySelector("#exampleInputanswer1"), {
      target: { value: "Football" },
    });
  };

  it("renders all required input fields + register button", () => {
    const { container, getByText } = render(<Register />);

    expect(container.querySelector("#exampleInputName1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputEmail1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputPassword1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputPhone1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputaddress1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputDOB1")).toBeInTheDocument();
    expect(container.querySelector("#exampleInputanswer1")).toBeInTheDocument();

    expect(getByText("REGISTER")).toBeInTheDocument();
  });

  it("submitting form sends POST with correct payload", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
      name: "John Doe",
      email: "john@test.com",
      password: "pass123",
      phone: "1234567890",
      address: "SG",
      DOB: "2000-01-01",
      answer: "Football",
    });
  });

  it("success response: shows success toast + navigates to /login", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    expect(toast.success).toHaveBeenCalledWith(
      "Register Successfully, please login"
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("failed response: shows error toast with server message", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Already Register please login" },
    });

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    expect(toast.error).toHaveBeenCalledWith("Already Register please login");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('failed response without message: shows fallback "Registration failed"', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false }, // no message -> triggers fallback branch
    });

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    expect(toast.error).toHaveBeenCalledWith("Registration failed");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('unexpected error: shows generic "Something went wrong"', async () => {
    axios.post.mockRejectedValueOnce(new Error("Network down"));

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
