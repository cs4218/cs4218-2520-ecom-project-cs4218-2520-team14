import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Pagenotfound from "./Pagenotfound";

// Mock Layout
jest.mock("./../components/Layout", () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="layout" data-title={title}>
      {children}
    </div>
  ),
}));

describe("Pagenotfound Page", () => {
  test("renders 404 title and heading", () => {
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  test("renders Go Back link with correct route", () => {
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );

    const link = screen.getByRole("link", { name: /go back/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  test("passes correct title prop to Layout", () => {
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );

    expect(screen.getByTestId("layout")).toHaveAttribute(
      "data-title",
      "go back- page not found"
    );
  });
});