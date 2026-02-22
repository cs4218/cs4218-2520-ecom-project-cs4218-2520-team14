import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import Spinner from "./Spinner";

// Mock react-router-dom
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/protected" }),
}));

describe("Spinner", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("renders initial countdown value (3 seconds)", () => {
    render(<Spinner />);
    expect(screen.getByText(/redirecting/i)).toHaveTextContent("3");
  });

  test("counts down every second", () => {
    render(<Spinner />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/redirecting/i)).toHaveTextContent("2");
  });

  test("navigates to default /login when countdown reaches 0", () => {
    render(<Spinner />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/protected",
    });
  });

  test("navigates to custom path when provided", () => {
    render(<Spinner path="dashboard" />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
      state: "/protected",
    });
  });
});