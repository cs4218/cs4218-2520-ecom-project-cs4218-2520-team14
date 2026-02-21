//Name: Shauryan Agrawal
//Student ID: A0265846N

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import Register from "./Register";

jest.mock("axios");
jest.mock("react-hot-toast");

// Mock Layout to avoid side effects (Header/useCategory etc.)
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

describe("Register.js (detailed 100% coverage aligned with current Register.js)", () => {
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const getForm = (container) => container.querySelector("form");

  const sel = {
    name: "#exampleInputName1",
    email: "#exampleInputEmail1",
    password: "#exampleInputPassword1",
    phone: "#exampleInputPhone1",
    address: "#exampleInputaddress1",
    dob: "#exampleInputDOB1",
    answer: "#exampleInputanswer1",
  };

  const fillAllFields = (container, overrides = {}) => {
    const data = {
      name: "John Doe",
      email: "john@test.com",
      password: "pass123",
      phone: "1234567890",
      address: "SG",
      DOB: "2000-01-01",
      answer: "Football",
      ...overrides,
    };

    fireEvent.change(container.querySelector(sel.name), {
      target: { value: data.name },
    });
    fireEvent.change(container.querySelector(sel.email), {
      target: { value: data.email },
    });
    fireEvent.change(container.querySelector(sel.password), {
      target: { value: data.password },
    });
    fireEvent.change(container.querySelector(sel.phone), {
      target: { value: data.phone },
    });
    fireEvent.change(container.querySelector(sel.address), {
      target: { value: data.address },
    });
    fireEvent.change(container.querySelector(sel.dob), {
      target: { value: data.DOB },
    });
    fireEvent.change(container.querySelector(sel.answer), {
      target: { value: data.answer },
    });

    return data;
  };

  it("renders Layout wrapper, all required inputs, and REGISTER button", () => {
    const { container, getByText, getByTestId } = render(<Register />);

    expect(getByTestId("layout")).toBeInTheDocument();

    expect(container.querySelector(sel.name)).toBeInTheDocument();
    expect(container.querySelector(sel.email)).toBeInTheDocument();
    expect(container.querySelector(sel.password)).toBeInTheDocument();
    expect(container.querySelector(sel.phone)).toBeInTheDocument();
    expect(container.querySelector(sel.address)).toBeInTheDocument();
    expect(container.querySelector(sel.dob)).toBeInTheDocument();
    expect(container.querySelector(sel.answer)).toBeInTheDocument();

    expect(getByText("REGISTER")).toBeInTheDocument();
  });

  it("inputs are controlled: typing updates each input's value", () => {
    const { container } = render(<Register />);

    fireEvent.change(container.querySelector(sel.name), {
      target: { value: "A" },
    });
    expect(container.querySelector(sel.name)).toHaveValue("A");

    fireEvent.change(container.querySelector(sel.email), {
      target: { value: "a@test.com" },
    });
    expect(container.querySelector(sel.email)).toHaveValue("a@test.com");

    fireEvent.change(container.querySelector(sel.password), {
      target: { value: "pw" },
    });
    expect(container.querySelector(sel.password)).toHaveValue("pw");

    fireEvent.change(container.querySelector(sel.phone), {
      target: { value: "999" },
    });
    expect(container.querySelector(sel.phone)).toHaveValue("999");

    fireEvent.change(container.querySelector(sel.address), {
      target: { value: "SG" },
    });
    expect(container.querySelector(sel.address)).toHaveValue("SG");

    fireEvent.change(container.querySelector(sel.dob), {
      target: { value: "2001-02-03" },
    });
    expect(container.querySelector(sel.dob)).toHaveValue("2001-02-03");

    fireEvent.change(container.querySelector(sel.answer), {
      target: { value: "Cricket" },
    });
    expect(container.querySelector(sel.answer)).toHaveValue("Cricket");
  });

  it("submitting form sends POST with correct payload (including DOB)", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const { container } = render(<Register />);
    const payload = fillAllFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      address: payload.address,
      DOB: payload.DOB,
      answer: payload.answer,
    });
  });

  it("success response: shows success toast + navigates to /login", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.success).toHaveBeenCalledWith(
      "Register Successfully, please login"
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("failed response: shows error toast with server message; does not navigate", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Already Register please login" },
    });

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.error).toHaveBeenCalledWith("Already Register please login");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('failed response without message: uses fallback "Registration failed"', async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false }, // no message -> fallback
    });

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(toast.error).toHaveBeenCalledWith("Registration failed");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('exception: logs error and shows generic "Something went wrong"; does not navigate', async () => {
    const err = new Error("Network down");
    axios.post.mockRejectedValueOnce(err);

    const { container } = render(<Register />);
    fillAllFields(container);

    fireEvent.submit(getForm(container));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    expect(console.error).toHaveBeenCalledWith(err);
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});