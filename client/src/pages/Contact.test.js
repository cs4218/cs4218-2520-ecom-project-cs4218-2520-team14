import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Contact from "./Contact";

// Mock Layout
jest.mock("./../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

// Mock react-icons (causes issues if not mocked)
jest.mock("react-icons/bi", () => ({
  __esModule: true,
  BiMailSend: () => <span data-testid="icon-mail" />,
  BiPhoneCall: () => <span data-testid="icon-phone" />,
  BiSupport: () => <span data-testid="icon-support" />,
}));

describe("Contact Component", () => {
  test("renders contact page heading", () => {
    render(<Contact />);
    expect(screen.getByText("CONTACT US")).toBeInTheDocument();
  });

  test("renders description text", () => {
    render(<Contact />);
    expect(
      screen.getByText(/For any query or info about product/i)
    ).toBeInTheDocument();
  });

  test("renders contact email/phone/support text", () => {
    render(<Contact />);
    expect(screen.getByText(/help@ecommerceapp\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/012-3456789/)).toBeInTheDocument();
    expect(screen.getByText(/1800-0000-0000/i)).toBeInTheDocument();
  });

  test("renders contact image", () => {
    render(<Contact />);
    const img = screen.getByAltText("contactus");
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  test("wraps content inside Layout", () => {
    render(<Contact />);
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });
});