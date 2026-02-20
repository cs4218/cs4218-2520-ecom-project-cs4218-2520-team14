// Author: Tan Qin Yong A0253468W

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Policy from "./Policy";

// Mock Layout properly (ESM-safe)
jest.mock("./../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

describe("Policy Component", () => {
  test("renders inside Layout", () => {
    render(<Policy />);
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  test("renders privacy policy text", () => {
    render(<Policy />);
    const texts = screen.getAllByText("add privacy policy");
    expect(texts.length).toBe(7);
  });

  test("renders policy image", () => {
    render(<Policy />);
    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });
});