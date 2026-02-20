import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer"; // adjust path if needed

describe("Footer Component", () => {
  test("renders footer text correctly", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/All Rights Reserved/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText("All Rights Reserved © TestingComp")
    ).toBeInTheDocument();
  });

  test("renders navigation links with correct href", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const aboutLink = screen.getByRole("link", { name: /about/i });
    const contactLink = screen.getByRole("link", { name: /contact/i });
    const policyLink = screen.getByRole("link", { name: /privacy policy/i });

    expect(aboutLink).toHaveAttribute("href", "/about");
    expect(contactLink).toHaveAttribute("href", "/contact");
    expect(policyLink).toHaveAttribute("href", "/policy");
  });

  test("renders exactly 3 links", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
  });
});