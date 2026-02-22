// Author: Tan Qin Yong A0253468W

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import About from "./About";

// Mock Layout
jest.mock("./../components/Layout", () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="layout" data-title={title}>
      {children}
    </div>
  ),
}));

describe("About Page", () => {
  test("renders About page content", () => {
    render(<About />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByText("Add text")).toBeInTheDocument();
  });

  test("passes correct title prop to Layout", () => {
    render(<About />);

    expect(screen.getByTestId("layout")).toHaveAttribute(
      "data-title",
      "About us - Ecommerce app"
    );
  });

  test("renders image with correct src and alt text", () => {
    render(<About />);

    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/about.jpeg");
  });
});